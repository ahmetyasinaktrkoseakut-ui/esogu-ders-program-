/**
 * ESOGÜ İlahiyat Fakültesi Ders Programı Çakışma ve Çizelgeleme Motoru (Solver)
 * Hata Payı 0 Kural Tabanlı Constraint Satisfaction (CSP) Algoritması
 */

class ScheduleSolver {
  constructor(allCourses) {
    this.allCourses = allCourses || [];
  }

  /**
   * Belirli bir dersin belirli bir cinsiyete uygun olup olmadığını kontrol eder.
   */
  isSectionGenderAllowed(course, gender) {
    if (!course.gender_restriction || course.gender_restriction === 'HEPSİ') return true;
    return course.gender_restriction === gender;
  }

  /**
   * Mantık dersi kuralını kontrol eder.
   * İlk defa alanlar için Şube A; alttan alanlar için Şube B, C veya İ.Ö. A
   */
  isMantikAllowed(course, mantikStatus) {
    if (!course.mantik_restriction || course.mantik_restriction === 'HEPSİ') return true;
    const status = mantikStatus || 'İLK_DEFA';
    return course.mantik_restriction === status;
  }

  /**
   * İki ders arasında saat çakışması olup olmadığını kontrol eder.
   */
  hasTimeConflict(courseA, courseB) {
    if (courseA.id === courseB.id) return false;
    // Okulda uygulama / staj derslik saati içermediğinden çakışma üretmez
    if (!courseA.time_slots || !courseB.time_slots) return false;

    for (const slotA of courseA.time_slots) {
      for (const slotB of courseB.time_slots) {
        if (slotA.day === slotB.day && slotA.hour === slotB.hour) {
          return {
            conflict: true,
            day: slotA.day,
            hour: slotA.hour,
            slotA: slotA,
            slotB: slotB
          };
        }
      }
    }
    return { conflict: false };
  }

  /**
   * Bir dersin mevcut programa eklenip eklenemeyeceğini test eder.
   */
  canAddToSchedule(course, currentSchedule) {
    for (const placed of currentSchedule) {
      const check = this.hasTimeConflict(course, placed);
      if (check.conflict) {
        return {
          compatible: false,
          conflictsWith: placed,
          day: check.day,
          hour: check.hour,
          reason: `${check.day} ${check.hour}:00 saatinde "${placed.name} (${placed.sube})" ile çakışıyor.`
        };
      }
    }
    return { compatible: true };
  }

  /**
   * Bir dersin öğrenci profiline göre seçilebilir şubelerini filtreler.
   * targetTeachingType 'KARISIK' ise hem 1. hem 2. öğretim şubelerini değerlendirir.
   */
  getEligibleSections(courseCode, profile, targetTeachingType = null) {
    const sample = this.allCourses.find(c => c.code === courseCode);
    const baseName = sample ? sample.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() : '';

    const matchingCourses = this.allCourses.filter(c => {
      const isCodeMatch = (c.code === courseCode);
      const isNameMatch = (baseName && c.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === baseName);
      if (!isCodeMatch && !isNameMatch) return false;

      // Cinsiyet Kısıtı: Yalnızca Kur'an Okuma derslerinde kız/erkek ayrımı vardır
      if (!this.isSectionGenderAllowed(c, profile.gender)) return false;

      // Mantık Dersi Kısıtı
      if (!this.isMantikAllowed(c, profile.mantik_status)) return false;

      return true;
    });

    if (matchingCourses.length === 0) return [];

    // Eğer targetTeachingType belirtilmişse ve 'KARISIK' değilse:
    if (targetTeachingType && targetTeachingType !== 'KARISIK' && targetTeachingType !== 'İkisi de (Karışık)') {
      const sameTeaching = matchingCourses.filter(c => c.teaching_type === targetTeachingType);
      if (sameTeaching.length > 0) return sameTeaching;
      // Eğer öğrencinin öğretim türünde bu ders hiç açılmamışsa (ortak tek şube ise) tüm şubeleri döndür
      return matchingCourses;
    }

    return matchingCourses;
  }

  /**
   * Ana Çözüm Algoritması:
   * Alttan dersler, Dönem Zorunlu Dersleri, Seçmeli Dersler ve Üstten Dersler için
   * çakışmasız en ideal kombinasyonu bulur.
   * 
   * Çakışma durumunda "En Uygun Program"ı kurar, çakışan dersi ayıklar ve nedenini açıklar.
   */
  solveSchedule(options) {
    const {
      profile,            // { curriculum, grade, teaching_type, gender, mantik_status, gpa_high }
      exemptions = [],    // Muaf olunan ders kodları/isimleri
      selectedMandatoryCodes = null, // Kullanıcının bizzat seçtiği zorunlu dersler (null ise döneminkiler)
      alttanCourseCodes = [], // Alttan kalan ders kodları (öncelikli)
      alttanElectiveCodes = [], // Alttan seçmeli ders kodları
      selectedElectiveCodes = [], // Kullanıcının seçtiği seçmeli ders kodları
      upperCourseCodes = [],  // Üstten alınan ders kodları
      manualSectionChoices = {}, // Kullanıcının elle kilitlediği şubeler { [courseCode]: sube }
      appBranch = null    // 4. Sınıf Öğretmenlik Uygulaması I şubesi
    } = options;

    // 1. Kendi Dönem Zorunlu Derslerini Belirle
    let activeMandatory = [];
    if (selectedMandatoryCodes !== null) {
      activeMandatory = selectedMandatoryCodes.filter(code => !exemptions.includes(code));
    } else {
      const periodMandatoryCourses = this.getMandatoryCoursesForProfile(profile);
      activeMandatory = periodMandatoryCourses.filter(code => !exemptions.includes(code));
    }

    // 2. Ders Gruplarını Öncelik Sırasına Göre Diz (Alttan > Zorunlu > Alttan Seçmeli > Seçmeli > Üstten)
    const prioritizedCourseRequests = [];

    // A. Alttan Kalan Dersler (EN YÜKSEK ÖNCELİK)
    for (const code of alttanCourseCodes) {
      if (!prioritizedCourseRequests.some(r => r.code === code)) {
        prioritizedCourseRequests.push({ code, priorityGroup: 'ALTTAN' });
      }
    }

    // B. Kendi Dönem Zorunlu Dersleri
    for (const code of activeMandatory) {
      if (!prioritizedCourseRequests.some(r => r.code === code)) {
        prioritizedCourseRequests.push({ code, priorityGroup: 'ZORUNLU' });
      }
    }

    // C. Alttan Seçmeli Dersler
    for (const code of alttanElectiveCodes) {
      if (!prioritizedCourseRequests.some(r => r.code === code)) {
        prioritizedCourseRequests.push({ code, priorityGroup: 'ALTTAN_SEÇMELİ' });
      }
    }

    // D. Seçmeli Dersler
    for (const code of selectedElectiveCodes) {
      if (!prioritizedCourseRequests.some(r => r.code === code)) {
        prioritizedCourseRequests.push({ code, priorityGroup: 'SEÇMELİ' });
      }
    }

    // D. Üstten Alınan Dersler
    for (const code of upperCourseCodes) {
      if (!prioritizedCourseRequests.some(r => r.code === code)) {
        prioritizedCourseRequests.push({ code, priorityGroup: 'ÜSTTEN' });
      }
    }

    // Her ders için uygun şubeleri hazırla
    const candidateSectionsPerCourse = [];
    for (const req of prioritizedCourseRequests) {
      let sections = this.getEligibleSections(req.code, profile, profile.teaching_type);

      // Öğretmenlik Uygulaması I için kullanıcı belirli bir şube seçmişse onu kilitle
      if (req.code === '181117069' && appBranch) {
        const specificSection = sections.filter(s => s.sube === appBranch);
        if (specificSection.length > 0) sections = specificSection;
      }

      // Kullanıcı bu ders için elle şube veya hoca kilitlemişse onu önceliklendir
      if (manualSectionChoices[req.code]) {
        const choice = manualSectionChoices[req.code];
        const locked = sections.filter(s => s.id === choice || s.sube === choice);
        if (locked.length > 0) {
          sections = locked;
        }
      }

      if (sections.length > 0) {
        candidateSectionsPerCourse.push({
          req,
          sections
        });
      } else {
        // Bu ders için uygun şube bulunamadı (örn. cinsiyet kısıtından dolayı)
        candidateSectionsPerCourse.push({
          req,
          sections: [],
          error: 'Uygun şube bulunamadı (Cinsiyet veya öğretim kısıtı).'
        });
      }
    }

    // 3. Hiyerarşik ve Birleştirilmiş Esnek Backtracking Algoritması
    // Öncelik Sırası: ALTTAN -> ZORUNLU -> ALTTAN_SEÇMELİ -> SEÇMELİ -> ÜSTTEN
    // Tüm esnek şubeler (kullanıcı kilitlemedikçe) seçmelileri sığdırabilmek için
    // birlikte değerlendirilir; böylece zorunlu bir dersin alternatif şubesi seçmeli dersin
    // programa girmesini sağlayabilir.
    let bestSchedule = [];
    const excludedCourses = [];

    const findValidSchedule = (itemsList) => {
      const bt = (idx, curr) => {
        if (idx === itemsList.length) return [...curr];
        const item = itemsList[idx];
        if (item.sections.length === 0) return null;
        for (const s of item.sections) {
          const check = this.canAddToSchedule(s, curr);
          if (check.compatible) {
            curr.push(s);
            const res = bt(idx + 1, curr);
            if (res) return res;
            curr.pop();
          }
        }
        return null;
      };
      return bt(0, []);
    };

    const alttanItems = candidateSectionsPerCourse.filter(i => i.req.priorityGroup === 'ALTTAN');
    const mandatoryItems = candidateSectionsPerCourse.filter(i => i.req.priorityGroup === 'ZORUNLU');
    const alttanElectiveItems = candidateSectionsPerCourse.filter(i => i.req.priorityGroup === 'ALTTAN_SEÇMELİ');
    const electiveItems = candidateSectionsPerCourse.filter(i => i.req.priorityGroup === 'SEÇMELİ');
    const upperItems = candidateSectionsPerCourse.filter(i => i.req.priorityGroup === 'ÜSTTEN');

    let acceptedItems = [];

    // 1. Aşama: Alttan Zorunlu Dersleri Ekle (En Yüksek Öncelik)
    for (const item of alttanItems) {
      if (item.sections.length === 0) {
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ALTTAN',
          name: this.getCourseNameByCode(item.req.code),
          reason: item.error || 'Uygun şube bulunamadı.'
        });
        continue;
      }
      const testSol = findValidSchedule([...acceptedItems, item]);
      if (testSol) {
        acceptedItems.push(item);
        bestSchedule = testSol;
      } else {
        const check = this.canAddToSchedule(item.sections[0], bestSchedule);
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ALTTAN',
          name: item.sections[0].name,
          reason: check.reason || 'Diğer alttan derslerle çakışıyor.',
          conflictsWith: check.conflictsWith || null
        });
      }
    }

    // 2. Aşama: Dönem Zorunlu Derslerini Ekle (Kredi yettiğince, esnek şube değişimiyle)
    for (const item of mandatoryItems) {
      if (item.sections.length === 0) {
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ZORUNLU',
          name: this.getCourseNameByCode(item.req.code),
          reason: item.error || 'Uygun şube bulunamadı.'
        });
        continue;
      }
      const testSol = findValidSchedule([...acceptedItems, item]);
      if (testSol) {
        acceptedItems.push(item);
        bestSchedule = testSol;
      } else {
        const check = this.canAddToSchedule(item.sections[0], bestSchedule);
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ZORUNLU',
          name: item.sections[0].name,
          reason: check.reason || 'Alttan veya diğer zorunlu derslerle çakışıyor.',
          conflictsWith: check.conflictsWith || null
        });
      }
    }

    // 3. Aşama: Alttan Seçmeli Dersleri Ekle
    for (const item of alttanElectiveItems) {
      if (item.sections.length === 0) {
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ALTTAN_SEÇMELİ',
          name: this.getCourseNameByCode(item.req.code),
          reason: item.error || 'Uygun şube bulunamadı.'
        });
        continue;
      }
      const testSol = findValidSchedule([...acceptedItems, item]);
      if (testSol) {
        acceptedItems.push(item);
        bestSchedule = testSol;
      } else {
        const check = this.canAddToSchedule(item.sections[0], bestSchedule);
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ALTTAN_SEÇMELİ',
          name: item.sections[0].name,
          reason: check.reason || 'Mevcut programdaki derslerle çakışıyor.',
          conflictsWith: check.conflictsWith || null
        });
      }
    }

    // 4. Aşama: Dönem Seçmeli Derslerini Ekle (Esnek şubelerle en iyi çakışmasız uyum)
    for (const item of electiveItems) {
      if (item.sections.length === 0) {
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'SEÇMELİ',
          name: this.getCourseNameByCode(item.req.code),
          reason: item.error || 'Uygun şube bulunamadı.'
        });
        continue;
      }
      const testSol = findValidSchedule([...acceptedItems, item]);
      if (testSol) {
        acceptedItems.push(item);
        bestSchedule = testSol;
      } else {
        const check = this.canAddToSchedule(item.sections[0], bestSchedule);
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'SEÇMELİ',
          name: item.sections[0].name,
          reason: check.reason || 'Mevcut programdaki derslerle çakışıyor.',
          conflictsWith: check.conflictsWith || null
        });
      }
    }

    // 5. Aşama: Üstten Dersleri Ekle
    for (const item of upperItems) {
      if (item.sections.length === 0) {
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ÜSTTEN',
          name: this.getCourseNameByCode(item.req.code),
          reason: item.error || 'Uygun şube bulunamadı.'
        });
        continue;
      }
      const testSol = findValidSchedule([...acceptedItems, item]);
      if (testSol) {
        acceptedItems.push(item);
        bestSchedule = testSol;
      } else {
        const check = this.canAddToSchedule(item.sections[0], bestSchedule);
        excludedCourses.push({
          code: item.req.code,
          priorityGroup: 'ÜSTTEN',
          name: item.sections[0].name,
          reason: check.reason || 'Mevcut programdaki derslerle çakışıyor.',
          conflictsWith: check.conflictsWith || null
        });
      }
    }

    // 4. Otomatik Seçmeli Ders Seçimi (İstenmişse kuraldaki sayı kadar çakışmayan seçmeli ekle)
    const {
      autoSelectElectives = false,
      targetElectiveCount = 0,
      alttanElectivesCount = 0,
      alttanElectivesGrade = 3
    } = options;

    if (autoSelectElectives) {
      // A. Alttan Seçmeli Dersleri Ata (Varsa)
      if (alttanElectivesCount > 0 && alttanElectivesGrade) {
        const alttanCandidates = this.allCourses.filter(c => {
          if (c.grade !== alttanElectivesGrade || c.category !== 'SEÇMELİ') return false;
          if (!this.isSectionGenderAllowed(c, profile.gender)) return false;
          if (profile.teaching_type !== 'KARISIK' && profile.teaching_type !== 'İkisi de (Karışık)' && c.teaching_type !== profile.teaching_type) {
            const hasInOwn = this.allCourses.some(x => x.grade === c.grade && x.category === 'SEÇMELİ' && x.teaching_type === profile.teaching_type && x.code === c.code);
            if (hasInOwn) return false;
          }
          return true;
        });
        const alttanByCode = {};
        alttanCandidates.forEach(c => {
          if (!alttanByCode[c.code]) alttanByCode[c.code] = [];
          alttanByCode[c.code].push(c);
        });
        for (const code in alttanByCode) {
          const placedAlttanElec = bestSchedule.filter(c => c.grade === alttanElectivesGrade && c.category === 'SEÇMELİ').length;
          if (placedAlttanElec >= alttanElectivesCount) break;
          if (acceptedItems.some(i => i.req.code === code)) continue;

          const item = {
            req: { code, priorityGroup: 'ALTTAN_SEÇMELİ' },
            sections: alttanByCode[code]
          };
          const testSol = findValidSchedule([...acceptedItems, item]);
          if (testSol) {
            acceptedItems.push(item);
            bestSchedule = testSol;
          }
        }
      }

      // B. Kendi Sınıfının Seçmeli Derslerini Ata
      if (targetElectiveCount > 0) {
        const gradeCandidates = this.allCourses.filter(c => {
          if (c.grade !== profile.grade || c.category !== 'SEÇMELİ') return false;
          if (c.code === '181117069') return false;
          if (!this.isSectionGenderAllowed(c, profile.gender)) return false;
          if (profile.teaching_type !== 'KARISIK' && profile.teaching_type !== 'İkisi de (Karışık)' && c.teaching_type !== profile.teaching_type) {
            const hasInOwn = this.allCourses.some(x => x.grade === c.grade && x.category === 'SEÇMELİ' && x.teaching_type === profile.teaching_type && x.code === c.code);
            if (hasInOwn) return false;
          }
          return true;
        });
        const gradeByCode = {};
        gradeCandidates.forEach(c => {
          if (!gradeByCode[c.code]) gradeByCode[c.code] = [];
          gradeByCode[c.code].push(c);
        });
        for (const code in gradeByCode) {
          const placedGradeElec = bestSchedule.filter(c => c.grade === profile.grade && c.category === 'SEÇMELİ' && c.code !== '181117069').length;
          if (placedGradeElec >= targetElectiveCount) break;
          if (acceptedItems.some(i => i.req.code === code)) continue;

          const item = {
            req: { code, priorityGroup: 'SEÇMELİ' },
            sections: gradeByCode[code]
          };
          const testSol = findValidSchedule([...acceptedItems, item]);
          if (testSol) {
            acceptedItems.push(item);
            bestSchedule = testSol;
          }
        }
      }
    }

    // 5. Kredi ve AKTS Hesaplamaları
    const stats = this.calculateScheduleStats(bestSchedule, profile);

    // 6. Çakışmayan Alternatif Seçmeli Önerileri
    const availableAlternatives = this.findCompatibleAlternatives(bestSchedule, profile);

    return {
      status: excludedCourses.length === 0 ? 'SUCCESS' : 'PARTIAL_CONFLICT',
      placed_courses: bestSchedule,
      excluded_courses: excludedCourses,
      stats,
      alternatives: availableAlternatives
    };
  }

  /**
   * Çakışmayan seçmeli dersleri kuraldaki sayı kadar otomatik bulur.
   */
  autoPickElectives(placedCourses, grade, count, gender, teachingType) {
    if (count <= 0) return [];
    const placedCodes = new Set(placedCourses.map(c => c.code));
    const placedNames = new Set(placedCourses.map(c => c.name.replace('(İKİNCİ ÖĞRETİM)', '').trim()));
    const chosen = [];

    const candidates = this.allCourses.filter(c => {
      if (c.grade !== grade || c.category !== 'SEÇMELİ') return false;
      if (!this.isSectionGenderAllowed(c, gender)) return false;
      if (teachingType !== 'KARISIK' && teachingType !== 'İkisi de (Karışık)' && c.teaching_type !== teachingType) return false;
      return true;
    });

    const byCode = {};
    candidates.forEach(c => {
      if (!byCode[c.code]) byCode[c.code] = [];
      byCode[c.code].push(c);
    });

    for (const code in byCode) {
      if (chosen.length >= count) break;
      if (placedCodes.has(code)) continue;

      const sections = byCode[code];
      const baseName = sections[0].name.replace('(İKİNCİ ÖĞRETİM)', '').trim();
      if (placedNames.has(baseName)) continue;

      for (const sec of sections) {
        let conflict = false;
        const currentTotal = [...placedCourses, ...chosen];
        for (const p of currentTotal) {
          const chk = this.hasTimeConflict(sec, p);
          if (chk.conflict) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          chosen.push(sec);
          placedNames.add(baseName);
          break;
        }
      }
    }

    return chosen;
  }

  /**
   * Öğrenci profiline göre zorunlu ders kodlarını getirir.
   */
  getMandatoryCoursesForProfile(profile) {
    const targetTeaching = (profile.teaching_type === 'KARISIK' || profile.teaching_type === 'İkisi de (Karışık)')
      ? '1. Öğretim'
      : profile.teaching_type;

    const codes = new Set();
    const gradeCourses = this.allCourses.filter(c => c.grade === profile.grade);

    gradeCourses.forEach(c => {
      const baseName = c.name.replace('(İKİNCİ ÖĞRETİM)', '').trim();
      if (profile.grade === 4) {
        if (c.is_2021_pf && (c.category === 'ZORUNLU' || c.code === '181117069')) {
          const hasInTarget = gradeCourses.some(x => (x.code === c.code || x.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === baseName) && x.teaching_type === targetTeaching);
          if (hasInTarget && c.teaching_type !== targetTeaching) return;
          codes.add(c.code);
        }
      } else if (c.category === 'ZORUNLU' && !c.is_2021_pf) {
        if (profile.grade === 1 && c.code === '181011002') return;
        const hasInTarget = gradeCourses.some(x => (x.code === c.code || x.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === baseName) && x.teaching_type === targetTeaching);
        if (hasInTarget && c.teaching_type !== targetTeaching) return;
        codes.add(c.code);
      }
    });

    return Array.from(codes);
  }

  /**
   * Ders kodundan ders adını bulur.
   */
  getCourseNameByCode(code) {
    const found = this.allCourses.find(c => c.code === code);
    return found ? found.name : code;
  }

  /**
   * Kredi, AKTS ve formasyon yükünü hesaplar.
   */
  calculateScheduleStats(schedule, profile) {
    let totalKredi = 0;
    let totalAKTS = 0;
    let formationKredi = 0;
    let formationAKTS = 0;
    let formationCount = 0;

    for (const c of schedule) {
      if (c.is_formation) {
        formationKredi += c.kredi;
        formationAKTS += c.akts;
        formationCount += 1;
      } else {
        totalKredi += c.kredi;
        totalAKTS += c.akts;
      }
    }

    // Limitler
    let maxKredi = 22;
    let maxAKTS = 34;

    if (profile.grade === 3) {
      maxAKTS = 37;
    }

    if (profile.gpa_high) {
      // Ortalama >= 3.00 ise Danışman onayı ile
      maxKredi = 30;
      maxAKTS = 45;
    }

    const is2021PF = profile.curriculum === '2021 P.F.' || profile.grade === 4;

    return {
      courseCount: schedule.length,
      totalKredi,
      totalAKTS,
      formationKredi,
      formationAKTS,
      formationCount,
      // Formasyon dahil toplamlar
      grandTotalKredi: totalKredi + formationKredi,
      grandTotalAKTS: totalAKTS + formationAKTS,
      maxKredi,
      maxAKTS,
      is2021PF,
      isLimitExceeded: is2021PF ? (totalKredi > maxKredi) : (totalAKTS > maxAKTS)
    };
  }

  /**
   * Mevcut programa eklenebilecek, çakışma yaratmayan alternatif dersleri listeler.
   */
  findCompatibleAlternatives(currentSchedule, profile) {
    const placedCodes = new Set(currentSchedule.map(c => c.code));
    const compatible = [];

    // Seçmeli dersleri ve diğer sınıfların derslerini tara
    const potentialCourses = this.allCourses.filter(c => {
      if (placedCodes.has(c.code)) return false;
      if (!this.isSectionGenderAllowed(c, profile.gender)) return false;
      return true;
    });

    const evaluatedCodes = new Set();

    for (const c of potentialCourses) {
      if (evaluatedCodes.has(c.code)) continue;
      evaluatedCodes.add(c.code);

      const check = this.canAddToSchedule(c, currentSchedule);
      if (check.compatible) {
        compatible.push({
          code: c.code,
          name: c.name,
          sube: c.sube,
          category: c.category,
          grade: c.grade,
          teaching_type: c.teaching_type,
          is_formation: c.is_formation,
          kredi: c.kredi,
          akts: c.akts,
          hoca: c.hoca,
          derslik: c.derslik,
          time_slots: c.time_slots
        });
      }
    }

    return compatible;
  }
}

// Global olarak tarayıcı ve Node ortamında erişilebilir yap
if (typeof window !== 'undefined') {
  window.ScheduleSolver = ScheduleSolver;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScheduleSolver;
}
