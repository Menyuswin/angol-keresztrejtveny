/* A keresztrejtveny-gyakorlo felulete. */
(function () {
  'use strict';

  var SZINTEK = {
    konnyu:  { darab: 12, meret: 15, nev: 'Könnyű' },
    kozepes: { darab: 18, meret: 17, nev: 'Közepes' },
    nehez:   { darab: 26, meret: 21, nev: 'Nehéz' },
    profi:   { darab: 34, meret: 25, nev: 'Profi' }
  };

  var TAROLO_KULCS = 'angol-keresztrejtveny-statisztika';

  var allapot = {
    feladvany: null,
    bevitelek: {},      // "sor,oszlop" -> input elem
    aktivSzo: null,
    vizszintesIrany: true,
    segitsegek: 0,
    kezdes: null,
    idozito: null,
    kesz: false
  };

  var elem = {};
  ['racs-burok', 'vizszintes-lista', 'fuggoleges-lista', 'ido', 'haladas',
   'segitseg-szam', 'statisztika', 'nehezseg', 'uj-gomb', 'ellenoriz-gomb',
   'betu-gomb', 'szo-gomb', 'megold-gomb', 'torol-gomb', 'nyomtat-gomb',
   'siker', 'siker-szoveg', 'siker-gomb', 'aktualis-definicio',
   'aktualis-jeloles', 'aktualis-szoveg', 'szoszedet-meret', 'verzio'
  ].forEach(function (id) {
    elem[id] = document.getElementById(id);
  });

  /* ---------- Statisztika ---------- */

  function statisztikatOlvas() {
    try {
      return JSON.parse(localStorage.getItem(TAROLO_KULCS)) || { megoldva: 0 };
    } catch (e) {
      return { megoldva: 0 };
    }
  }

  function statisztikatMent(adat) {
    try { localStorage.setItem(TAROLO_KULCS, JSON.stringify(adat)); } catch (e) { /* privat mod */ }
  }

  function statisztikatKiir() {
    elem['statisztika'].textContent = statisztikatOlvas().megoldva;
  }

  /* ---------- Ido ---------- */

  function idotIndit() {
    allapot.kezdes = Date.now();
    if (allapot.idozito) clearInterval(allapot.idozito);
    allapot.idozito = setInterval(idotFrissit, 1000);
    idotFrissit();
  }

  function idotFrissit() {
    if (!allapot.kezdes) return;
    var mp = Math.floor((Date.now() - allapot.kezdes) / 1000);
    var perc = String(Math.floor(mp / 60)).padStart(2, '0');
    var masodperc = String(mp % 60).padStart(2, '0');
    elem['ido'].textContent = perc + ':' + masodperc;
  }

  function idotMegallit() {
    if (allapot.idozito) clearInterval(allapot.idozito);
    allapot.idozito = null;
  }

  /* ---------- Rejtveny felepitese ---------- */

  function kulcs(sor, oszlop) { return sor + ',' + oszlop; }

  function ujRejtveny() {
    var szint = SZINTEK[elem['nehezseg'].value] || SZINTEK.kozepes;

    allapot.feladvany = window.Keresztrejtveny.general({
      szavak: window.SZOSZEDET,
      darab: szint.darab,
      meret: szint.meret
    });
    allapot.bevitelek = {};
    allapot.aktivSzo = null;
    allapot.segitsegek = 0;
    allapot.kesz = false;

    elem['siker'].hidden = true;
    elem['segitseg-szam'].textContent = '0';

    racsotKirajzol();
    definiciokatKirajzol();
    haladastFrissit();
    idotIndit();

    if (allapot.feladvany.szavak.length) szotKivalaszt(allapot.feladvany.szavak[0]);
  }

  function racsotKirajzol() {
    var f = allapot.feladvany;
    var tabla = document.createElement('table');
    tabla.className = 'racs';

    // A cellameret a rendelkezesre allo szelessegbol jon, hogy ne kelljen gorgetni.
    var hely = elem['racs-burok'].clientWidth || 620;
    var cellaMeret = Math.max(22, Math.min(42, Math.floor((hely - 4) / Math.max(f.oszlopok, 1))));
    tabla.style.setProperty('--cella', cellaMeret + 'px');

    for (var r = 0; r < f.sorok; r++) {
      var tr = document.createElement('tr');
      for (var c = 0; c < f.oszlopok; c++) {
        var td = document.createElement('td');
        var betu = f.racs[r][c];

        if (betu == null) {
          tr.appendChild(td);
          continue;
        }

        td.className = 'betu';
        td.dataset.sor = r;
        td.dataset.oszlop = c;

        var szam = f.szamok[kulcs(r, c)];
        if (szam) {
          var jel = document.createElement('span');
          jel.className = 'szam';
          jel.textContent = szam;
          td.appendChild(jel);
        }

        var input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.autocapitalize = 'characters';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.inputMode = 'text';
        input.dataset.sor = r;
        input.dataset.oszlop = c;
        input.setAttribute('aria-label', (r + 1) + '. sor ' + (c + 1) + '. oszlop');

        input.addEventListener('focus', cellaFokusz);
        input.addEventListener('input', cellaBevitel);
        input.addEventListener('keydown', cellaBillentyu);
        input.addEventListener('mousedown', cellaEgerKattintas);

        td.appendChild(input);
        allapot.bevitelek[kulcs(r, c)] = input;
        tr.appendChild(td);
      }
      tabla.appendChild(tr);
    }

    elem['racs-burok'].innerHTML = '';
    elem['racs-burok'].appendChild(tabla);
  }

  function definiciokatKirajzol() {
    var f = allapot.feladvany;
    elem['vizszintes-lista'].innerHTML = '';
    elem['fuggoleges-lista'].innerHTML = '';

    f.szavak.forEach(function (sz) {
      var li = document.createElement('li');
      li.dataset.id = sz.id;

      var szam = document.createElement('span');
      szam.className = 'def-szam';
      szam.textContent = sz.szam + '.';

      var szoveg = document.createElement('span');
      szoveg.className = 'def-szoveg';
      szoveg.textContent = sz.definicio + ' ';

      var hossz = document.createElement('span');
      hossz.className = 'def-hossz';
      hossz.textContent = '(' + sz.szo.length + ' betű)';
      szoveg.appendChild(hossz);

      li.appendChild(szam);
      li.appendChild(szoveg);
      li.addEventListener('click', function () { szotKivalaszt(sz, true); });

      (sz.vizszintes ? elem['vizszintes-lista'] : elem['fuggoleges-lista']).appendChild(li);
    });
  }

  /* ---------- Szo kivalasztasa, kiemelesek ---------- */

  function szoCellai(sz) {
    var cellak = [];
    for (var i = 0; i < sz.szo.length; i++) {
      cellak.push(sz.vizszintes
        ? { sor: sz.sor, oszlop: sz.oszlop + i }
        : { sor: sz.sor + i, oszlop: sz.oszlop });
    }
    return cellak;
  }

  function szavakEgyCellaban(sor, oszlop) {
    return allapot.feladvany.szavak.filter(function (sz) {
      return szoCellai(sz).some(function (p) {
        return p.sor === sor && p.oszlop === oszlop;
      });
    });
  }

  function szotKivalaszt(sz, fokuszal) {
    allapot.aktivSzo = sz;
    allapot.vizszintesIrany = sz.vizszintes;
    kiemelesFrissit();

    if (fokuszal !== false) {
      // Az elso ures cellara ugrunk, ha van.
      var cellak = szoCellai(sz);
      var cel = cellak.find(function (p) {
        var inp = allapot.bevitelek[kulcs(p.sor, p.oszlop)];
        return inp && !inp.value;
      }) || cellak[0];
      var input = allapot.bevitelek[kulcs(cel.sor, cel.oszlop)];
      if (input) input.focus();
    }
  }

  function kiemelesFrissit() {
    var tablaCellak = elem['racs-burok'].querySelectorAll('td.betu');
    Array.prototype.forEach.call(tablaCellak, function (td) {
      td.classList.remove('szo-kiemelt', 'cella-kiemelt');
    });

    var sz = allapot.aktivSzo;
    if (!sz) {
      elem['aktualis-definicio'].hidden = true;
      return;
    }

    szoCellai(sz).forEach(function (p) {
      var input = allapot.bevitelek[kulcs(p.sor, p.oszlop)];
      if (input) input.parentNode.classList.add('szo-kiemelt');
    });

    var aktiv = document.activeElement;
    if (aktiv && aktiv.dataset && aktiv.dataset.sor != null) {
      aktiv.parentNode.classList.remove('szo-kiemelt');
      aktiv.parentNode.classList.add('cella-kiemelt');
    }

    elem['aktualis-definicio'].hidden = false;
    elem['aktualis-jeloles'].textContent =
      sz.szam + '. ' + (sz.vizszintes ? 'Vízszintes' : 'Függőleges');
    elem['aktualis-szoveg'].textContent =
      sz.definicio + ' (' + sz.szo.length + ' betű)';

    var listaElemek = document.querySelectorAll('.definicio-lista li');
    Array.prototype.forEach.call(listaElemek, function (li) {
      li.classList.toggle('kivalasztott', Number(li.dataset.id) === sz.id);
    });
  }

  /* ---------- Bevitel kezelese ---------- */

  function cellaEgerKattintas(esemeny) {
    var input = esemeny.currentTarget;
    // Ha ugyanarra a cellara kattintunk ujra, iranyt valtunk.
    if (document.activeElement === input) {
      iranytValt();
      esemeny.preventDefault();
    }
  }

  function cellaFokusz(esemeny) {
    var input = esemeny.currentTarget;
    var sor = Number(input.dataset.sor);
    var oszlop = Number(input.dataset.oszlop);
    var jeloltek = szavakEgyCellaban(sor, oszlop);
    if (!jeloltek.length) return;

    var kivalasztott =
      jeloltek.find(function (sz) { return sz.vizszintes === allapot.vizszintesIrany; }) ||
      jeloltek[0];

    allapot.aktivSzo = kivalasztott;
    allapot.vizszintesIrany = kivalasztott.vizszintes;
    input.select();
    kiemelesFrissit();
  }

  function iranytValt() {
    var aktiv = document.activeElement;
    if (!aktiv || aktiv.dataset.sor == null) return;
    var sor = Number(aktiv.dataset.sor);
    var oszlop = Number(aktiv.dataset.oszlop);
    var jeloltek = szavakEgyCellaban(sor, oszlop);
    var masik = jeloltek.find(function (sz) { return sz.vizszintes !== allapot.vizszintesIrany; });
    if (masik) {
      allapot.vizszintesIrany = masik.vizszintes;
      allapot.aktivSzo = masik;
      kiemelesFrissit();
    }
  }

  function cellaBevitel(esemeny) {
    var input = esemeny.currentTarget;
    var ertek = (input.value || '').toUpperCase().replace(/[^A-Z]/g, '');
    input.value = ertek.slice(-1);
    input.parentNode.classList.remove('hibas');

    if (input.value) kovetkezoCella(input, 1);
    haladastFrissit();
    keszEllenorzes();
  }

  function cellaBillentyu(esemeny) {
    var input = esemeny.currentTarget;
    var sor = Number(input.dataset.sor);
    var oszlop = Number(input.dataset.oszlop);
    var k = esemeny.key;

    if (k === ' ') { esemeny.preventDefault(); iranytValt(); return; }

    if (k === 'Backspace') {
      esemeny.preventDefault();
      input.parentNode.classList.remove('hibas', 'felfedett');
      if (input.value) {
        input.value = '';
      } else {
        kovetkezoCella(input, -1);
        var elozo = document.activeElement;
        if (elozo && elozo.dataset.sor != null) {
          elozo.value = '';
          elozo.parentNode.classList.remove('hibas', 'felfedett');
        }
      }
      haladastFrissit();
      return;
    }

    if (k === 'Delete') {
      esemeny.preventDefault();
      input.value = '';
      input.parentNode.classList.remove('hibas', 'felfedett');
      haladastFrissit();
      return;
    }

    if (k === 'Enter' || k === 'Tab') {
      esemeny.preventDefault();
      kovetkezoSzo(esemeny.shiftKey ? -1 : 1);
      return;
    }

    var iranyok = {
      ArrowUp:    { dr: -1, dc: 0, vizszintes: false },
      ArrowDown:  { dr: 1,  dc: 0, vizszintes: false },
      ArrowLeft:  { dr: 0,  dc: -1, vizszintes: true },
      ArrowRight: { dr: 0,  dc: 1,  vizszintes: true }
    };
    if (iranyok[k]) {
      esemeny.preventDefault();
      var i = iranyok[k];
      // Ha mas iranyba lepnenk, elobb valtsunk iranyt.
      if (allapot.vizszintesIrany !== i.vizszintes) {
        allapot.vizszintesIrany = i.vizszintes;
        var jeloltek = szavakEgyCellaban(sor, oszlop);
        var egyezo = jeloltek.find(function (sz) { return sz.vizszintes === i.vizszintes; });
        if (egyezo) allapot.aktivSzo = egyezo;
      }
      lepj(sor + i.dr, oszlop + i.dc, i.dr, i.dc);
      return;
    }
  }

  /* Elmozdulas a racson; ures cellakat atugorva keressuk a kovetkezo betuhelyet. */
  function lepj(sor, oszlop, dr, dc) {
    var f = allapot.feladvany;
    var r = sor, c = oszlop;
    while (r >= 0 && c >= 0 && r < f.sorok && c < f.oszlopok) {
      var input = allapot.bevitelek[kulcs(r, c)];
      if (input) { input.focus(); kiemelesFrissit(); return; }
      r += dr; c += dc;
    }
  }

  /* Lepes a szon belul elore (+1) vagy hatra (-1). */
  function kovetkezoCella(input, irany) {
    var sz = allapot.aktivSzo;
    if (!sz) return;
    var cellak = szoCellai(sz);
    var sor = Number(input.dataset.sor);
    var oszlop = Number(input.dataset.oszlop);
    var index = cellak.findIndex(function (p) {
      return p.sor === sor && p.oszlop === oszlop;
    });
    var uj = index + irany;
    if (uj < 0 || uj >= cellak.length) return;
    var cel = allapot.bevitelek[kulcs(cellak[uj].sor, cellak[uj].oszlop)];
    if (cel) { cel.focus(); kiemelesFrissit(); }
  }

  /* Ugras a kovetkezo (vagy elozo) meghatarozasra. */
  function kovetkezoSzo(irany) {
    var f = allapot.feladvany;
    if (!f.szavak.length) return;
    var n = f.szavak.length;
    var mod = function (x) { return ((x % n) + n) % n; };
    var mostani = allapot.aktivSzo ? f.szavak.indexOf(allapot.aktivSzo) : -1;

    // Elsodlegesen a kovetkezo meg befejezetlen szora ugrunk.
    for (var lepes = 1; lepes <= n; lepes++) {
      var jelolt = f.szavak[mod(mostani + irany * lepes)];
      if (!szoKesz(jelolt)) { szotKivalaszt(jelolt); return; }
    }
    // Ha mar minden kesz, egyszeruen a szomszedosra lepunk.
    szotKivalaszt(f.szavak[mod(mostani + irany)]);
  }

  /* ---------- Allapot ---------- */

  function cellaErtek(sor, oszlop) {
    var input = allapot.bevitelek[kulcs(sor, oszlop)];
    return input ? (input.value || '').toUpperCase() : '';
  }

  function szoBeirt(sz) {
    return szoCellai(sz).map(function (p) { return cellaErtek(p.sor, p.oszlop) || ' '; }).join('');
  }

  function szoKesz(sz) {
    return szoBeirt(sz) === sz.szo;
  }

  function haladastFrissit() {
    var f = allapot.feladvany;
    if (!f) return;
    var kesz = f.szavak.filter(szoKesz).length;
    elem['haladas'].textContent = kesz + ' / ' + f.szavak.length;

    var listaElemek = document.querySelectorAll('.definicio-lista li');
    Array.prototype.forEach.call(listaElemek, function (li) {
      var sz = f.szavak[Number(li.dataset.id)];
      li.classList.toggle('kesz', sz && szoKesz(sz));
    });
  }

  function keszEllenorzes() {
    var f = allapot.feladvany;
    if (!f || allapot.kesz) return;
    var mind = f.szavak.every(szoKesz);
    if (!mind) return;

    allapot.kesz = true;
    idotMegallit();

    var stat = statisztikatOlvas();
    stat.megoldva = (stat.megoldva || 0) + 1;
    statisztikatMent(stat);
    statisztikatKiir();

    elem['siker-szoveg'].textContent =
      f.szavak.length + ' szó megfejtve ' + elem['ido'].textContent + ' alatt, ' +
      allapot.segitsegek + ' segítséggel.';
    elem['siker'].hidden = false;
  }

  /* ---------- Segito gombok ---------- */

  function ellenoriz() {
    var f = allapot.feladvany;
    var hiba = 0;
    f.szavak.forEach(function (sz) {
      szoCellai(sz).forEach(function (p, i) {
        var input = allapot.bevitelek[kulcs(p.sor, p.oszlop)];
        if (!input || !input.value) return;
        var helyes = input.value.toUpperCase() === sz.szo[i];
        if (!helyes) { input.parentNode.classList.add('hibas'); hiba++; }
      });
    });
    if (!hiba) {
      elem['ellenoriz-gomb'].textContent = 'Eddig hibátlan ✓';
      setTimeout(function () { elem['ellenoriz-gomb'].textContent = 'Ellenőrzés'; }, 1600);
    }
  }

  function betutFelfed() {
    var aktiv = document.activeElement;
    var sz = allapot.aktivSzo;
    if (!sz) return;

    var cellak = szoCellai(sz);
    var index = 0;
    if (aktiv && aktiv.dataset.sor != null) {
      var i = cellak.findIndex(function (p) {
        return p.sor === Number(aktiv.dataset.sor) && p.oszlop === Number(aktiv.dataset.oszlop);
      });
      if (i >= 0) index = i;
    }
    // Ha az aktualis cella mar helyes, az elso hibas/ures cellat keressuk.
    if (cellaErtek(cellak[index].sor, cellak[index].oszlop) === sz.szo[index]) {
      var uj = cellak.findIndex(function (p, j) {
        return cellaErtek(p.sor, p.oszlop) !== sz.szo[j];
      });
      if (uj < 0) return;
      index = uj;
    }

    var input = allapot.bevitelek[kulcs(cellak[index].sor, cellak[index].oszlop)];
    input.value = sz.szo[index];
    input.parentNode.classList.remove('hibas');
    input.parentNode.classList.add('felfedett');
    allapot.segitsegek++;
    elem['segitseg-szam'].textContent = allapot.segitsegek;
    haladastFrissit();
    keszEllenorzes();
  }

  function szotFelfed() {
    var sz = allapot.aktivSzo;
    if (!sz) return;
    szoCellai(sz).forEach(function (p, i) {
      var input = allapot.bevitelek[kulcs(p.sor, p.oszlop)];
      if (input.value.toUpperCase() !== sz.szo[i]) {
        input.value = sz.szo[i];
        input.parentNode.classList.remove('hibas');
        input.parentNode.classList.add('felfedett');
      }
    });
    allapot.segitsegek++;
    elem['segitseg-szam'].textContent = allapot.segitsegek;
    haladastFrissit();
    keszEllenorzes();
  }

  function mindentFelfed() {
    if (!window.confirm('Biztosan megmutassuk a teljes megoldást?')) return;
    allapot.feladvany.szavak.forEach(function (sz) {
      szoCellai(sz).forEach(function (p, i) {
        var input = allapot.bevitelek[kulcs(p.sor, p.oszlop)];
        input.value = sz.szo[i];
        input.parentNode.classList.remove('hibas');
        input.parentNode.classList.add('felfedett');
      });
    });
    allapot.kesz = true;   // megoldva-szamlalot ne novelje
    idotMegallit();
    haladastFrissit();
  }

  function mindentTorol() {
    Object.keys(allapot.bevitelek).forEach(function (k) {
      var input = allapot.bevitelek[k];
      input.value = '';
      input.parentNode.classList.remove('hibas', 'felfedett');
    });
    haladastFrissit();
  }

  /* ---------- Indulas ---------- */

  elem['uj-gomb'].addEventListener('click', ujRejtveny);
  elem['siker-gomb'].addEventListener('click', ujRejtveny);
  elem['nehezseg'].addEventListener('change', ujRejtveny);
  elem['ellenoriz-gomb'].addEventListener('click', ellenoriz);
  elem['betu-gomb'].addEventListener('click', betutFelfed);
  elem['szo-gomb'].addEventListener('click', szotFelfed);
  elem['megold-gomb'].addEventListener('click', mindentFelfed);
  elem['torol-gomb'].addEventListener('click', mindentTorol);
  elem['nyomtat-gomb'].addEventListener('click', function () { window.print(); });

  // Atmeretezeskor csak a cellameretet igazitjuk, a feladvany marad.
  var atmeretezesIdozito = null;
  window.addEventListener('resize', function () {
    clearTimeout(atmeretezesIdozito);
    atmeretezesIdozito = setTimeout(function () {
      var tabla = elem['racs-burok'].querySelector('table.racs');
      if (!tabla || !allapot.feladvany) return;
      var hely = elem['racs-burok'].clientWidth || 620;
      var meret = Math.max(22, Math.min(42,
        Math.floor((hely - 4) / Math.max(allapot.feladvany.oszlopok, 1))));
      tabla.style.setProperty('--cella', meret + 'px');
    }, 150);
  });

  elem['szoszedet-meret'].textContent =
    'A szószedet ' + window.SZOSZEDET.length + ' szót tartalmaz.';
  elem['verzio'].textContent = window.SZOSZEDET.length + ' szó';

  statisztikatKiir();
  ujRejtveny();
})();
