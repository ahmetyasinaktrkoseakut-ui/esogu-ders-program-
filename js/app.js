/**
 * ESOGÜ İlahiyat Fakültesi - ÖBS Birebir Ders Seçim Sistemi (ogubs1.ogu.edu.tr/DersSecim.aspx)
 * Resmi Arayüz ve Fonksiyonlar - Eksiksiz Şube ve Ders Yönetimi
 */

document.addEventListener('DOMContentLoaded', () => {
  const allCourses = window.SCHEDULE_DATA || [];
  const solver = new ScheduleSolver(allCourses);

  // Büyük/Küçük harf, Türkçe/İngilizce karakter duyarsız arama
  function turkishNormalize(text) {
    if (!text) return '';
    return text
      .toString()
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/\u0307/g, '') // combining dot above kaldırma
      .replace(/ı/g, 'i')    // hem 'ı' hem 'i' eşlensin (hadis / hadıs fark etmez)
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/['’`´]/g, '') // kesme işaretlerini kaldır (kuran / kur'an)
      .trim();
  }

  // Uygulama Durumu (State)
  const state = {
    profile: {
      grade: 3,
      curriculum: 'AKTS 2024',
      teaching_type: 'ALL', // ALL: Tümü (1. ve 2. Öğretim)
      gender: 'ALL',        // ALL: Tüm Şubeler (Kız + Erkek)
      gpa_high: false,
      app_branch: 'A',
      exclude_formation: true
    },
    activeGradeFilter: 3,
    showAllBranches: true,
    placedCourses: [],
    failedCourses: [], // Başarısız zorunlu dersler
    failedElectives: { 2: 0, 3: 0, 4: 0 }, // Başarısız seçmeli havuzu (Sınıf bazlı adet)
    searchQuery: '',
    failedFilterMode: 'ALL_FAILED'
  };

  // DOM Elemanları
  const selectGrade = document.getElementById('selectGrade');
  const selectCurriculum = document.getElementById('selectCurriculum');
  const selectTeachingType = document.getElementById('selectTeachingType');
  const selectGender = document.getElementById('selectGender');
  const selectGPA = document.getElementById('selectGPA');
  const chkExcludeFormation = document.getElementById('chkExcludeFormation');
  const selectAppBranch = document.getElementById('selectAppBranch');
  const appBranchSpan = document.getElementById('appBranchSpan');

  const obsGradeRadios = document.querySelectorAll('input[name="gradeRadio"]');
  const obsSearchInput = document.getElementById('obsSearchInput');
  const chkShowAllBranches = document.getElementById('chkShowAllBranches');
  const statOpenCount = document.getElementById('statOpenCount');

  const tbodyAcilanDersler = document.getElementById('tbodyAcilanDersler');
  const tbodyBasarisizDersler = document.getElementById('tbodyBasarisizDersler');
  const tbodySecilenDersler = document.getElementById('tbodySecilenDersler');
  const tbodyTimetable = document.getElementById('tbodyTimetable');

  const statKredi = document.getElementById('statKredi');
  const statAKTS = document.getElementById('statAKTS');
  const statLimitText = document.getElementById('statLimitText');
  const statCourseCount = document.getElementById('statCourseCount');

  const btnSaveSchedule = document.getElementById('btnSaveSchedule');
  const btnPrintPDF = document.getElementById('btnPrintPDF');
  const btnDownloadPNG = document.getElementById('btnDownloadPNG');
  const btnClearAll = document.getElementById('btnClearAll');
  const btnManageFailedCourses = document.getElementById('btnManageFailedCourses');
  const btnOpenNewCourseModal = document.getElementById('btnOpenNewCourseModal');

  // Modallar
  const modalGuide = document.getElementById('modalGuide');
  const btnCloseModalGuide = document.getElementById('btnCloseModalGuide');
  const btnStartGuide = document.getElementById('btnStartGuide');
  const btnFloatingGuide = document.getElementById('btnFloatingGuide');

  const modalFailed = document.getElementById('modalFailed');
  const btnCloseModalFailed = document.getElementById('btnCloseModalFailed');
  const btnSaveFailedModal = document.getElementById('btnSaveFailedModal');
  const modalFailedCount2 = document.getElementById('modalFailedCount2');
  const modalFailedCount3 = document.getElementById('modalFailedCount3');
  const modalFailedCount4 = document.getElementById('modalFailedCount4');
  const modalSelectedFailedChips = document.getElementById('modalSelectedFailedChips');
  const selectedFailedBadge = document.getElementById('selectedFailedBadge');
  const modalFailedSearchInput = document.getElementById('modalFailedSearchInput');
  const modalMandatoryList = document.getElementById('modalMandatoryList');

  const modalNewCourse = document.getElementById('modalNewCourse');
  const btnCloseModalNewCourse = document.getElementById('btnCloseModalNewCourse');
  const modalSearchAllInput = document.getElementById('modalSearchAllInput');
  const modalFilterGrade = document.getElementById('modalFilterGrade');
  const modalTbodyAllCourses = document.getElementById('modalTbodyAllCourses');

  const failedRadios = document.querySelectorAll('input[name="failedRadio"]');

  const DAYS = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
  const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

  // 1. BAŞLANGIÇ ÇİZİMLERİ
  initTimetable();
  renderAcilanDersler();
  renderBasarisizDersler();
  renderSecilenDersler();
  updateStats();

  // KULLANIM KILAVUZU: SİSTEM AÇILIR AÇILMAZ EKRANA GELİR
  if (modalGuide) {
    modalGuide.classList.add('show');
  }

  btnCloseModalGuide?.addEventListener('click', () => {
    modalGuide.classList.remove('show');
  });

  btnStartGuide?.addEventListener('click', () => {
    modalGuide.classList.remove('show');
  });

  btnFloatingGuide?.addEventListener('click', () => {
    modalGuide.classList.add('show');
  });

  // 2. PROFİL VE FİLTRE DİNLEYİCİLERİ
  selectGrade.addEventListener('change', (e) => {
    state.profile.grade = parseInt(e.target.value, 10);
    state.activeGradeFilter = state.profile.grade;
    appBranchSpan.style.display = (state.profile.grade === 4) ? 'inline' : 'none';
    syncGradeRadios();
    renderAcilanDersler();
    updateStats();
  });

  selectCurriculum.addEventListener('change', (e) => {
    state.profile.curriculum = e.target.value;
    renderAcilanDersler();
    updateStats();
  });

  selectTeachingType.addEventListener('change', (e) => {
    state.profile.teaching_type = e.target.value;
    renderAcilanDersler();
  });

  selectGender.addEventListener('change', (e) => {
    state.profile.gender = e.target.value;
    renderAcilanDersler();
  });

  selectGPA.addEventListener('change', (e) => {
    state.profile.gpa_high = (e.target.value === 'HIGH');
    updateStats();
  });

  selectAppBranch?.addEventListener('change', (e) => {
    state.profile.app_branch = e.target.value;
  });

  chkExcludeFormation.addEventListener('change', (e) => {
    state.profile.exclude_formation = e.target.checked;
    updateStats();
  });

  chkShowAllBranches?.addEventListener('change', (e) => {
    state.showAllBranches = e.target.checked;
    renderAcilanDersler();
  });

  function syncGradeRadios() {
    obsGradeRadios.forEach(r => {
      r.checked = (parseInt(r.value, 10) === state.activeGradeFilter);
    });
  }

  obsGradeRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      state.activeGradeFilter = parseInt(e.target.value, 10);
      renderAcilanDersler();
    });
  });

  obsSearchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    renderAcilanDersler();
  });

  failedRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      state.failedFilterMode = e.target.value;
      renderBasarisizDersler();
    });
  });

  // 3. HAFTALIK MATRİSİN OLUŞTURULMASI (07:00 - 22:00)
  function initTimetable() {
    tbodyTimetable.innerHTML = '';
    HOURS.forEach(h => {
      const tr = document.createElement('tr');
      const timeStr = `${h < 10 ? '0' : ''}${h}:00`;

      const tdTime = document.createElement('td');
      tdTime.className = 'time-col';
      tdTime.textContent = timeStr;
      tr.appendChild(tdTime);

      DAYS.forEach(day => {
        const td = document.createElement('td');
        td.id = `cell_${day}_${h}`;
        tr.appendChild(td);
      });

      tbodyTimetable.appendChild(tr);
    });
  }

  // 4. AÇILAN DERSLER TABLOSUNUN ÇİZİLMESİ (HİÇBİR ŞUBE GİZLENMEZ!)
  function renderAcilanDersler() {
    tbodyAcilanDersler.innerHTML = '';
    const grade = state.activeGradeFilter;
    const query = turkishNormalize(state.searchQuery);
    const showAll = state.showAllBranches;

    const filtered = allCourses.filter(c => {
      if (c.grade !== grade) return false;

      // Öğretim türü kontrolü
      if (state.profile.teaching_type !== 'ALL') {
        if (c.teaching_type !== state.profile.teaching_type) {
          // Kendi öğretim türünde hiç açılmamışsa (ortak ders) göster
          const hasInOwn = allCourses.some(x =>
            x.grade === grade &&
            x.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === c.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() &&
            x.teaching_type === state.profile.teaching_type
          );
          if (hasInOwn) return false;
        }
      }

      // Cinsiyet Kısıtı kontrolü (Yalnızca Kur'an Okuma derslerinde geçerlidir)
      if (state.profile.gender !== 'ALL') {
        if (!solver.isSectionGenderAllowed(c, state.profile.gender)) {
          return false;
        }
      }

      // Arama filtresi (Türkçe karakter uyumlu)
      if (query) {
        const mCode = turkishNormalize(c.code).includes(query);
        const mName = turkishNormalize(c.name).includes(query);
        const mSube = turkishNormalize(c.sube).includes(query);
        const mHoca = turkishNormalize(c.hoca || '').includes(query);
        if (!mCode && !mName && !mSube && !mHoca) return false;
      }

      return true;
    });

    if (statOpenCount) {
      statOpenCount.textContent = `(${filtered.length} Şube Açık)`;
    }

    if (filtered.length === 0) {
      tbodyAcilanDersler.innerHTML = `<tr><td colspan="10" class="obs-center" style="padding:16px; color:#888;">Aradığınız kriterlere uygun açılan ders bulunamadı.</td></tr>`;
      return;
    }

    filtered.forEach(c => {
      const isExactPlaced = state.placedCourses.some(p => p.id === c.id);

      const tr = document.createElement('tr');
      if (isExactPlaced) {
        tr.className = 'obs-row-selected'; // PDF Sayfa 12: Seçilen ders gri boyanır
      }

      const timeSummary = c.time_slots.map(s => `${s.day.slice(0, 2)}: ${s.hour}:00`).join(' ') || (c.has_internship ? 'Staj (6 Saat)' : '-');

      // Rozetler: (Seç), 2.Ö ve Cinsiyet Rozetleri
      const secTag = (c.category === 'SEÇMELİ') ? '<span style="color:#d97706; font-weight:bold; font-size:10px;"> (Seç)</span>' : '';
      let badges = '';
      if (c.teaching_type === '2. Öğretim') {
        badges += '<span style="color:#b45309; font-size:10px; font-weight:bold;"> [2.Ö]</span>';
      }
      if (c.gender_restriction === 'KIZ') {
        badges += '<span style="color:#b91c1c; font-size:10px; font-weight:bold;"> [Kız Şubesi]</span>';
      } else if (c.gender_restriction === 'ERKEK') {
        badges += '<span style="color:#0369a1; font-size:10px; font-weight:bold;"> [Erkek Şubesi]</span>';
      }

      tr.innerHTML = `
        <td><strong>${c.code}</strong></td>
        <td>
          <strong>${c.name}</strong>${secTag} (${c.sube}) ${timeSummary}; [${c.derslik}]${badges}
        </td>
        <td class="obs-center">${c.teo}</td>
        <td class="obs-center">${c.uyg}</td>
        <td class="obs-center">${c.kredi}</td>
        <td class="obs-center"><strong>${c.akts}</strong></td>
        <td class="obs-center">0/45 x</td>
        <td class="obs-center">x</td>
        <td class="obs-center">x</td>
        <td>${c.unvan ? c.unvan + ' ' : ''}${c.hoca}</td>
      `;

      tr.addEventListener('click', () => {
        handleToggleCourse(c);
      });

      tbodyAcilanDersler.appendChild(tr);
    });
  }

  // 5. DERSİ SEÇME / DEĞİŞTİRME / PROGRAMDAN ÇIKARMA (TOGGLE)
  function handleToggleCourse(course) {
    const existingIndex = state.placedCourses.findIndex(p => p.id === course.id);

    if (existingIndex >= 0) {
      // ZATEN SEÇİLİ -> PROGRAMDAN ÇIKAR
      state.placedCourses.splice(existingIndex, 1);
      renderAllViews();
      return;
    }

    // Cinsiyet Kısıtı Uyarısı (Erkek öğrenci Kız şubesi seçtiğinde bilgilendirme)
    if (course.gender_restriction && course.gender_restriction !== 'HEPSİ') {
      if (state.profile.gender !== 'ALL' && state.profile.gender !== course.gender_restriction) {
        const ok = confirm(`⚠️ CİNSİYET BİLGİLENDİRMESİ:\n\nBu şube (${course.gender_restriction}) öğrenciler için açılmıştır.\nSizin profil seçiminiz: (${state.profile.gender}).\n\nYine de bu şubeyi ders programınıza eklemek istiyor musunuz?`);
        if (!ok) return;
      }
    }

    // AYNI DERSİN FARKLI BİR ŞUBESİ SEÇİLİYSE ONU KALDIRIP YENİSİNİ EKLE
    const courseBaseName = course.name.replace('(İKİNCİ ÖĞRETİM)', '').trim();
    const sameCourseIdx = state.placedCourses.findIndex(p =>
      p.code === course.code ||
      p.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === courseBaseName
    );

    const otherPlaced = sameCourseIdx >= 0
      ? state.placedCourses.filter((_, idx) => idx !== sameCourseIdx)
      : [...state.placedCourses];

    // SEÇMELİ DERS LİMİTİ KONTROLÜ
    if (course.category === 'SEÇMELİ' && course.code !== '181117069') {
      const grade = course.grade;
      let maxElective = (grade === 4) ? (otherPlaced.some(p => p.code === '181117069') ? 1 : 2) : (grade === 1 ? 0 : 2);
      // Alttan başarısız seçmeli girilmişse limite ekle
      const extraElectives = (state.failedElectives && state.failedElectives[grade]) || 0;
      maxElective += extraElectives;

      const currentGradeElectives = otherPlaced.filter(p => p.grade === grade && p.category === 'SEÇMELİ' && p.code !== '181117069').length;
      if (currentGradeElectives >= maxElective) {
        alert(`⚠️ SEÇMELİ DERS LİMİTİ:\n\n${grade}. Sınıfta dönemlik kural olarak en fazla ${maxElective} adet seçmeli ders seçebilirsiniz!\n\nBaşka bir seçmeli ders eklemek için lütfen önce seçtiklerinizden birini ("Sil" butonundan) kaldırınız.`);
        return;
      }
    }

    // ÇAKIŞMA KONTROLÜ
    const check = solver.canAddToSchedule(course, otherPlaced);
    if (!check.compatible) {
      alert(`⚠️ ÇAKIŞMA TESPİT EDİLDİ:\n\nSeçilen Ders: ${course.name} (${course.sube})\nÇakışma: ${check.reason}\n\nLütfen çakışan diğer dersinizi çıkarınız veya çakışmayan başka bir şube seçiniz.`);
      return;
    }

    // BAŞARIYLA PROGRAMA EKLE
    state.placedCourses = [...otherPlaced, course];
    renderAllViews();
  }

  function renderAllViews() {
    renderAcilanDersler();
    renderSecilenDersler();
    renderTimetable();
    renderBasarisizDersler();
    updateStats();
  }

  // 6. ANADAL İÇİN SEÇİLEN DERSLER TABLOSUNUN ÇİZİLMESİ (Sağ Üst - Tam Liste)
  function renderSecilenDersler() {
    tbodySecilenDersler.innerHTML = '';

    if (state.placedCourses.length === 0) {
      tbodySecilenDersler.innerHTML = `
        <tr>
          <td colspan="9" class="obs-center" style="padding:16px; color:#888;">
            Kayıtlı Ders YOK
          </td>
        </tr>
      `;
      return;
    }

    state.placedCourses.forEach(c => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="obs-center">
          <button class="btn-trash-sil" data-id="${c.id}" title="Bu dersi sil">🗑️</button>
        </td>
        <td class="obs-center"><input type="checkbox" checked disabled></td>
        <td class="obs-center"><span class="obs-group-box"></span></td>
        <td><strong>${c.code}</strong></td>
        <td><strong>${c.name}</strong>${c.category === 'SEÇMELİ' ? '<span style="color:#d97706; font-weight:bold; font-size:10px;"> (Seç)</span>' : ''} (${c.sube}) <span style="color:#666; font-size:10px;">[${c.teaching_type}]</span></td>
        <td class="obs-center"><strong>${c.akts}</strong></td>
        <td class="obs-center">${c.kredi}</td>
        <td class="obs-center">-</td>
        <td class="obs-center">-</td>
      `;

      tr.querySelector('.btn-trash-sil').addEventListener('click', (e) => {
        e.stopPropagation();
        state.placedCourses = state.placedCourses.filter(p => p.id !== c.id);
        renderAllViews();
      });

      tbodySecilenDersler.appendChild(tr);
    });
  }

  // 7. DERS PROGRAMI HAFTALIK MATRİSİNİN ÇİZİLMESİ (Sağ Alt - PDF Sayfa 13 Yeşili)
  function renderTimetable() {
    HOURS.forEach(h => {
      DAYS.forEach(day => {
        const cell = document.getElementById(`cell_${day}_${h}`);
        if (cell) {
          cell.className = '';
          cell.innerHTML = '';
          cell.title = '';
          cell.onclick = null;
        }
      });
    });

    state.placedCourses.forEach(c => {
      c.time_slots.forEach(slot => {
        const cell = document.getElementById(`cell_${slot.day}_${slot.hour}`);
        if (cell) {
          cell.className = 'cell-placed-green'; // ÖBS Açık Yeşil (#90ee90)
          cell.innerHTML = `<div><strong>${c.code}</strong></div>`;
          cell.title = `${c.code} - ${c.name} (${c.sube})\n${c.unvan ? c.unvan + ' ' : ''}${c.hoca}\nDerslik: ${c.derslik}\n(Tıklayarak silebilirsiniz)`;

          cell.onclick = () => {
            if (confirm(`'${c.name} (${c.sube})' dersini programdan silmek istiyor musunuz?`)) {
              state.placedCourses = state.placedCourses.filter(p => p.id !== c.id);
              renderAllViews();
            }
          };
        }
      });
    });
  }

  // 8. BAŞARISIZ DERSLER TABLOSUNUN ÇİZİLMESİ (Sol Alt - Seçildikçe Düşen Seçmeliler)
  function renderBasarisizDersler() {
    tbodyBasarisizDersler.innerHTML = '';

    const items = [];

    // 1. Başarısız zorunlu dersler (Tüm sınıflardan seçilenler)
    state.failedCourses.forEach(fc => {
      const isPlaced = state.placedCourses.some(p => p.code === fc.code || p.name.replace('(İKİNCİ ÖĞRETİM)', '').trim() === fc.name.replace('(İKİNCİ ÖĞRETİM)', '').trim());
      items.push({
        ...fc,
        isPlaced: isPlaced
      });
    });

    // 2. Başarısız seçmeli ders havuzu (2., 3., 4. Sınıf seçmelileri - Her biri ayrı satır!)
    [2, 3, 4].forEach(g => {
      const totalForGrade = (state.failedElectives && state.failedElectives[g]) || 0;
      if (totalForGrade > 0) {
        const placedCount = state.placedCourses.filter(p => p.grade === g && p.category === 'SEÇMELİ' && p.code !== '181117069').length;
        for (let i = 1; i <= totalForGrade; i++) {
          const isDone = (placedCount >= i);
          items.push({
            type: 'ELECTIVE_POOL',
            code: `SEC-${g}-0${i}`,
            name: `${g}. Sınıf Seçmeli Ders - ${i} (Alttan)`,
            grade: g,
            letter: 'FF',
            isDone: isDone,
            index: i,
            totalForGrade: totalForGrade
          });
        }
      }
    });

    // Filtreleme: failedFilterMode
    let visibleItems = items;
    if (state.failedFilterMode === 'UNSELECTED') {
      visibleItems = items.filter(item => {
        if (item.type === 'ELECTIVE_POOL') {
          return !item.isDone;
        } else {
          return !item.isPlaced;
        }
      });
    }

    if (visibleItems.length === 0) {
      tbodyBasarisizDersler.innerHTML = `<tr><td colspan="4" class="obs-center" style="padding:16px; color:#888;">${items.length === 0 ? 'Kayıtlı Ders YOK' : 'Tüm başarısız dersler programa eklendi.'}</td></tr>`;
      return;
    }

    visibleItems.forEach(item => {
      const tr = document.createElement('tr');

      if (item.type === 'ELECTIVE_POOL') {
        tr.innerHTML = `
          <td><strong>${item.code}</strong></td>
          <td><strong>${item.name}</strong></td>
          <td class="obs-center" style="color:#cc0000; font-weight:bold;">${item.letter}</td>
          <td>
            ${item.isDone
              ? '<span style="color:#28a745; font-weight:bold;">✓ Yerine Alındı (Düştü)</span>'
              : `<button class="btn-obs-cyan btn-goto-failed-sec" data-grade="${item.grade}" style="font-size:10px; padding:2px 6px;">Açılanı Bul</button>`}
          </td>
        `;

        const btnGotoSec = tr.querySelector('.btn-goto-failed-sec');
        if (btnGotoSec) {
          btnGotoSec.addEventListener('click', () => {
            state.activeGradeFilter = item.grade;
            syncGradeRadios();
            state.searchQuery = 'Seç';
            obsSearchInput.value = 'Seç';
            renderAcilanDersler();
          });
        }
      } else {
        tr.innerHTML = `
          <td><strong>${item.code}</strong></td>
          <td><strong>${item.name}</strong> (${item.grade}. Sınıf Zorunlu)</td>
          <td class="obs-center" style="color:#cc0000; font-weight:bold;">${item.letter}</td>
          <td>
            ${item.isPlaced
              ? '<span style="color:#28a745; font-weight:bold;">✓ Programa Eklendi</span>'
              : `<button class="btn-obs-cyan btn-goto-failed" data-code="${item.code}" style="font-size:10px; padding:2px 6px;">Açılanı Bul</button>`}
          </td>
        `;

        const btnGoto = tr.querySelector('.btn-goto-failed');
        if (btnGoto) {
          btnGoto.addEventListener('click', () => {
            state.activeGradeFilter = item.grade;
            syncGradeRadios();
            state.searchQuery = item.code;
            obsSearchInput.value = item.code;
            renderAcilanDersler();
          });
        }
      }

      tbodyBasarisizDersler.appendChild(tr);
    });
  }

  // 9. İSTATİSTİK GÜNCELLEMESİ (Kredi, AKTS, Limit)
  function updateStats() {
    const stats = solver.calculateScheduleStats(state.placedCourses, state.profile);

    const isPF = (state.profile.curriculum === '2021 P.F.' || state.profile.grade === 4);
    if (isPF) {
      const total = state.profile.exclude_formation ? stats.totalKredi : stats.grandTotalKredi;
      statKredi.textContent = total;
      statAKTS.textContent = stats.totalAKTS;
      statLimitText.textContent = `${stats.maxKredi} Kredi (Max)`;
    } else {
      const total = state.profile.exclude_formation ? stats.totalAKTS : stats.grandTotalAKTS;
      statKredi.textContent = stats.totalKredi;
      statAKTS.textContent = total;
      statLimitText.textContent = `${stats.maxAKTS} AKTS (Max)`;
    }

    statCourseCount.textContent = `${state.placedCourses.length} Ders Seçildi`;
  }

  // 10. DERSLERİ KAYDET BUTONU
  btnSaveSchedule.addEventListener('click', () => {
    if (state.placedCourses.length === 0) {
      alert('Programınız henüz boş! Lütfen sol panelden ders seçimi yapınız.');
      return;
    }
    const stats = solver.calculateScheduleStats(state.placedCourses, state.profile);
    alert(`💾 DERS PROGRAMINIZ BAŞARIYLA KAYDEDİLDİ!\n\nToplam Ders Sayısı: ${stats.courseCount}\nToplam Kredi: ${stats.totalKredi}\nToplam AKTS: ${stats.totalAKTS}\nÇakışma: Sıfır (0)`);
  });

  // 11. TÜMÜNÜ TEMİZLE
  btnClearAll.addEventListener('click', () => {
    if (confirm('Tüm seçimleri sıfırlamak istediğinize emin misiniz?')) {
      state.placedCourses = [];
      renderAllViews();
    }
  });

  // 12. YAZDIR / PDF (KAYDIRMA KESİNTİSİ OLMADAN TAM ÇIKTI)
  btnPrintPDF.addEventListener('click', () => {
    if (state.placedCourses.length === 0) {
      alert('Program henüz boş! Lütfen önce ders seçimi yapınız.');
      return;
    }
    window.print();
  });

  // 13. RESİM İNDİR (PNG) (KAYDIRMA KESİNTİSİ OLMADAN TAM GÖRSEL)
  btnDownloadPNG.addEventListener('click', async () => {
    if (state.placedCourses.length === 0) {
      alert('Program henüz boş! Lütfen önce ders seçimi yapınız.');
      return;
    }

    btnDownloadPNG.disabled = true;
    const oldText = btnDownloadPNG.textContent;
    btnDownloadPNG.textContent = 'Resim Hazırlanıyor...';

    // PNG İndirme: Banner ve Sağ Panel (Program + Ders Listesi) dahil görsel oluştur
    let exportWrapper = document.getElementById('pngExportWrapper');
    if (!exportWrapper) {
      exportWrapper = document.createElement('div');
      exportWrapper.id = 'pngExportWrapper';
      exportWrapper.style.background = '#ffffff';
      exportWrapper.style.padding = '8px';
      exportWrapper.style.width = '1100px';
    }

    const headerBannerClone = document.getElementById('mainHeaderBanner').cloneNode(true);
    const rightColClone = document.querySelector('.obs-col-right').cloneNode(true);
    
    // Geçici dışa aktarım konteyneri
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '1100px';
    tempContainer.style.background = '#ffffff';

    // Seçilen kutudaki kaydırmayı aç
    const clonedBox = rightColClone.querySelector('#boxSecilenDersler');
    if (clonedBox) {
      clonedBox.style.maxHeight = 'none';
      clonedBox.style.height = 'auto';
      clonedBox.style.overflow = 'visible';
    }
    // Eylem butonlarını kaldır (çıktıda gereksiz)
    const clonedActions = rightColClone.querySelector('.obs-action-panel');
    if (clonedActions) clonedActions.style.display = 'none';

    rightColClone.style.width = '100%';
    headerBannerClone.style.marginBottom = '12px';

    tempContainer.appendChild(headerBannerClone);
    tempContainer.appendChild(rightColClone);
    document.body.appendChild(tempContainer);

    const targetEl = tempContainer;
    const selectedBox = document.getElementById('boxSecilenDersler');

    // Kaydırmalı alanın tüm dersleri gösterecek şekilde açılması
    const prevMaxH = selectedBox ? selectedBox.style.maxHeight : '';
    const prevH = selectedBox ? selectedBox.style.height : '';
    const prevOv = selectedBox ? selectedBox.style.overflow : '';
    if (selectedBox) {
      selectedBox.style.maxHeight = 'none';
      selectedBox.style.height = 'auto';
      selectedBox.style.overflow = 'visible';
    }

    try {
      if (typeof html2canvas === 'undefined') {
        throw new Error('Görsel kütüphanesi yüklenemedi.');
      }

      const canvas = await html2canvas(targetEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const fileName = `ESOGUIF_Ders_Programi_${state.profile.grade}_Sinif.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (document.body.contains(tempContainer)) document.body.removeChild(tempContainer);
    } catch (err) {
      if (document.body.contains(tempContainer)) document.body.removeChild(tempContainer);
      console.error(err);
      alert('Resim oluşturulurken hata meydana geldi. Alternatif olarak "Yazdır / PDF" butonunu kullanabilirsiniz.');
    } finally {
      if (selectedBox) {
        selectedBox.style.maxHeight = prevMaxH;
        selectedBox.style.height = prevH;
        selectedBox.style.overflow = prevOv;
      }
      btnDownloadPNG.disabled = false;
      btnDownloadPNG.textContent = oldText;
    }
  });

  // 14. BAŞARISIZ DERSLER MODAL YÖNETİMİ (TÜM SINIFLARIN ZORUNLU DERSLERİ)
  const tempSelectedFailedMap = new Map();

  btnManageFailedCourses.addEventListener('click', () => {
    tempSelectedFailedMap.clear();
    state.failedCourses.forEach(c => {
      tempSelectedFailedMap.set(c.code, { ...c });
    });

    if (modalFailedCount2) modalFailedCount2.value = (state.failedElectives && state.failedElectives[2]) || 0;
    if (modalFailedCount3) modalFailedCount3.value = (state.failedElectives && state.failedElectives[3]) || 0;
    if (modalFailedCount4) modalFailedCount4.value = (state.failedElectives && state.failedElectives[4]) || 0;

    if (modalFailedSearchInput) modalFailedSearchInput.value = '';

    updateSelectedFailedChips();
    renderModalMandatoryList();
    modalFailed.classList.add('show');
  });

  btnCloseModalFailed.addEventListener('click', () => {
    modalFailed.classList.remove('show');
  });

  modalFailedSearchInput?.addEventListener('input', () => {
    renderModalMandatoryList();
  });

  function updateSelectedFailedChips() {
    if (!modalSelectedFailedChips) return;
    modalSelectedFailedChips.innerHTML = '';
    const items = Array.from(tempSelectedFailedMap.values());

    if (selectedFailedBadge) {
      selectedFailedBadge.textContent = `${items.length} ders seçili`;
    }

    if (items.length === 0) {
      modalSelectedFailedChips.innerHTML = '<span style="color:#94a3b8; font-size:10.5px; font-style:italic;">Henüz ders seçilmedi. Aşağıdaki listeden kutucukları işaretleyiniz.</span>';
      return;
    }

    items.forEach(it => {
      const chip = document.createElement('span');
      chip.style.cssText = 'background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe; border-radius:12px; font-size:10.5px; font-weight:600; padding:2px 8px; display:inline-flex; align-items:center; gap:5px;';
      chip.innerHTML = `<span>${it.name} (${it.grade}. Sınıf)</span><span class="chip-remove" style="cursor:pointer; color:#ef4444; font-weight:bold; font-size:13px; line-height:1;" title="Seçimi Kaldır">&times;</span>`;
      chip.querySelector('.chip-remove').addEventListener('click', () => {
        tempSelectedFailedMap.delete(it.code);
        updateSelectedFailedChips();
        renderModalMandatoryList();
      });
      modalSelectedFailedChips.appendChild(chip);
    });
  }

  function renderModalMandatoryList() {
    modalMandatoryList.innerHTML = '';
    const query = turkishNormalize(modalFailedSearchInput ? modalFailedSearchInput.value : '');

    // Fakültedeki TÜM Zorunlu Dersleri (1, 2, 3, 4. Sınıf) Derle
    const mandatoryCourses = allCourses.filter(c => c.category === 'ZORUNLU');

    // Kod + İsim bazında tekilleştir
    const uniqueMap = new Map();
    mandatoryCourses.forEach(c => {
      const baseName = c.name.replace('(İKİNCİ ÖĞRETİM)', '').trim();
      const key = `${c.grade}_${baseName}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          grade: c.grade,
          code: c.code,
          name: baseName,
          kredi: c.kredi,
          akts: c.akts
        });
      }
    });

    const allMandatoryList = Array.from(uniqueMap.values());
    allMandatoryList.sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, 'tr'));

    const grades = [1, 2, 3, 4];
    let totalRendered = 0;

    grades.forEach(g => {
      const gradeItems = allMandatoryList.filter(c => {
        if (c.grade !== g) return false;
        if (query) {
          const mCode = turkishNormalize(c.code).includes(query);
          const mName = turkishNormalize(c.name).includes(query);
          if (!mCode && !mName) return false;
        }
        return true;
      });

      if (gradeItems.length === 0) return;

      const groupHeader = document.createElement('div');
      groupHeader.style.background = '#eef2ff';
      groupHeader.style.padding = '4px 8px';
      groupHeader.style.fontWeight = 'bold';
      groupHeader.style.color = '#3730a3';
      groupHeader.style.fontSize = '11px';
      groupHeader.style.marginTop = '6px';
      groupHeader.style.marginBottom = '4px';
      groupHeader.style.borderLeft = '3px solid #4f46e5';
      groupHeader.textContent = `📌 ${g}. Sınıf Zorunlu Dersleri (${gradeItems.length} Ders)`;
      modalMandatoryList.appendChild(groupHeader);

      gradeItems.forEach(c => {
        totalRendered++;
        const isChecked = tempSelectedFailedMap.has(c.code);
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.padding = '3px 8px';
        label.style.cursor = 'pointer';
        label.style.borderBottom = '1px solid #f0f0f0';
        label.innerHTML = `
          <input type="checkbox" value="${c.code}" data-name="${c.name}" data-grade="${c.grade}" ${isChecked ? 'checked' : ''}>
          <span><strong>${c.code}</strong> - ${c.name} <span style="color:#666; font-size:10px;">(${c.akts} AKTS / ${c.kredi} Kredi)</span></span>
        `;

        const chk = label.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            tempSelectedFailedMap.set(c.code, {
              type: 'MANDATORY',
              code: c.code,
              name: c.name,
              grade: c.grade,
              kredi: c.kredi,
              akts: c.akts,
              letter: 'FF'
            });
          } else {
            tempSelectedFailedMap.delete(c.code);
          }
          updateSelectedFailedChips();
        });

        modalMandatoryList.appendChild(label);
      });
    });

    if (totalRendered === 0) {
      modalMandatoryList.innerHTML = '<div style="padding:16px; color:#888; text-align:center;">Aramanıza uygun zorunlu ders bulunamadı.</div>';
    }
  }

  btnSaveFailedModal.addEventListener('click', () => {
    // Hem ekranda görünen hem de arama yapıldığı için gizlenmiş ama seçilmiş olan TÜM dersleri kaydet
    state.failedCourses = Array.from(tempSelectedFailedMap.values());

    const c2 = parseInt(modalFailedCount2?.value, 10) || 0;
    const c3 = parseInt(modalFailedCount3?.value, 10) || 0;
    const c4 = parseInt(modalFailedCount4?.value, 10) || 0;

    state.failedElectives = { 2: c2, 3: c3, 4: c4 };

    modalFailed.classList.remove('show');
    renderBasarisizDersler();
  });

  // Başarısız dersler radyo filtreleri
  failedRadios.forEach(r => {
    r.addEventListener('change', (e) => {
      state.failedFilterMode = e.target.value;
      renderBasarisizDersler();
    });
  });

  // 15. YENİ DERS EKLE MODAL YÖNETİMİ
  btnOpenNewCourseModal.addEventListener('click', () => {
    modalNewCourse.classList.add('show');
    renderModalAllCourses();
  });

  btnCloseModalNewCourse.addEventListener('click', () => {
    modalNewCourse.classList.remove('show');
  });

  modalSearchAllInput.addEventListener('input', renderModalAllCourses);
  modalFilterGrade.addEventListener('change', renderModalAllCourses);

  function renderModalAllCourses() {
    modalTbodyAllCourses.innerHTML = '';
    const query = turkishNormalize(modalSearchAllInput.value.trim());
    const gr = modalFilterGrade.value;

    const filtered = allCourses.filter(c => {
      if (gr !== 'ALL' && c.grade.toString() !== gr) return false;
      if (query) {
        const mCode = turkishNormalize(c.code).includes(query);
        const mName = turkishNormalize(c.name).includes(query);
        const mSube = turkishNormalize(c.sube).includes(query);
        const mHoca = turkishNormalize(c.hoca || '').includes(query);
        if (!mCode && !mName && !mSube && !mHoca) return false;
      }
      return true;
    });

    filtered.forEach(c => {
      const isPlaced = state.placedCourses.some(p => p.id === c.id);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.code}</strong></td>
        <td><strong>${c.name}</strong>${c.category === 'SEÇMELİ' ? '<span style="color:#d97706; font-weight:bold; font-size:10px;"> (Seç)</span>' : ''}</td>
        <td class="obs-center">${c.grade}</td>
        <td class="obs-center">${c.sube}</td>
        <td>${c.teaching_type}</td>
        <td>${c.unvan ? c.unvan + ' ' : ''}${c.hoca}</td>
        <td class="obs-center">
          <button class="btn-obs-cyan btn-add-modal" style="font-size:10px; padding:2px 6px; ${isPlaced ? 'background:#d9534f; border-color:#d9534f;' : ''}">
            ${isPlaced ? 'Kaldır' : '+ Ekle'}
          </button>
        </td>
      `;

      tr.querySelector('.btn-add-modal').addEventListener('click', () => {
        handleToggleCourse(c);
        renderModalAllCourses();
      });

      modalTbodyAllCourses.appendChild(tr);
    });
  }

  document.getElementById('btnMessages')?.addEventListener('click', () => {
    alert('📬 Sistem Mesajları: Yeni bir mesajınız bulunmamaktadır.');
  });
});
