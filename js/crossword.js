/* Keresztrejtveny-generator.
 *
 * A generalas menete:
 *   1. veletlen szohalmaz a szoszedetbol, hossz szerint csokkeno sorrendben
 *   2. az elso szo a racs kozepere, vizszintesen
 *   3. minden tovabbi szot a mar lerakott szavakkal valo betumetszesekbe
 *      probalunk beilleszteni, a legjobb pontszamu helyre
 *   4. a kesz racsot a befoglalo teglalapra vagjuk es megszamozzuk
 */
(function (global) {
  'use strict';

  var URES = null;

  function veletlenSorrend(tomb, rnd) {
    var t = tomb.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var seged = t[i];
      t[i] = t[j];
      t[j] = seged;
    }
    return t;
  }

  // Egyszeru, maggal inditható veletlenszam-generator, hogy egy rejtveny
  // ujra eloallithato legyen (megoszthato / ujrajatszhato ugyanaz a feladvany).
  function rngKeszit(mag) {
    var allapot = mag >>> 0;
    if (allapot === 0) allapot = 0x9e3779b9;
    return function () {
      allapot ^= allapot << 13; allapot >>>= 0;
      allapot ^= allapot >>> 17;
      allapot ^= allapot << 5; allapot >>>= 0;
      return allapot / 4294967296;
    };
  }

  function racsKeszit(meret) {
    var racs = new Array(meret);
    for (var r = 0; r < meret; r++) {
      racs[r] = new Array(meret);
      for (var c = 0; c < meret; c++) racs[r][c] = URES;
    }
    return racs;
  }

  function cella(racs, r, c) {
    if (r < 0 || c < 0 || r >= racs.length || c >= racs.length) return undefined;
    return racs[r][c];
  }

  /* Megvizsgalja, hogy a szo elhelyezheto-e a megadott pozicioba.
   * Visszaad null-t (nem lehet), vagy egy objektumot a metszesek szamaval. */
  function ellenoriz(racs, szo, sor, oszlop, vizszintes) {
    var meret = racs.length;
    var hossz = szo.length;
    if (sor < 0 || oszlop < 0) return null;
    if (vizszintes ? oszlop + hossz > meret : sor + hossz > meret) return null;
    if (sor >= meret || oszlop >= meret) return null;

    // A szo elott es utan kotelezoen ures cella (kulonben hosszabb szo jonne letre)
    var elotteR = vizszintes ? sor : sor - 1;
    var elotteC = vizszintes ? oszlop - 1 : oszlop;
    var utanaR = vizszintes ? sor : sor + hossz;
    var utanaC = vizszintes ? oszlop + hossz : oszlop;
    if (cella(racs, elotteR, elotteC) != null) return null;
    if (cella(racs, utanaR, utanaC) != null) return null;

    var metszesek = 0;
    for (var i = 0; i < hossz; i++) {
      var r = vizszintes ? sor : sor + i;
      var c = vizszintes ? oszlop + i : oszlop;
      var meglevo = racs[r][c];

      if (meglevo != null) {
        if (meglevo !== szo[i]) return null; // utkozo betu
        metszesek++;
        continue;
      }

      // Ures cellaba irunk: a meroleges szomszedok nem lehetnek foglaltak,
      // mert akkor veletlen "melleknev" szo keletkezne.
      var szomszed1 = vizszintes ? cella(racs, r - 1, c) : cella(racs, r, c - 1);
      var szomszed2 = vizszintes ? cella(racs, r + 1, c) : cella(racs, r, c + 1);
      if (szomszed1 != null || szomszed2 != null) return null;
    }

    if (metszesek === 0) return null; // minden szonak kapcsolodnia kell
    return { metszesek: metszesek };
  }

  function beir(racs, szo, sor, oszlop, vizszintes) {
    for (var i = 0; i < szo.length; i++) {
      if (vizszintes) racs[sor][oszlop + i] = szo[i];
      else racs[sor + i][oszlop] = szo[i];
    }
  }

  /* Megkeresi a szo legjobb helyet a mar lerakott szavakhoz kepest. */
  function legjobbHely(racs, szo, lerakottak, rnd) {
    var jeloltek = [];

    for (var li = 0; li < lerakottak.length; li++) {
      var l = lerakottak[li];
      var ujVizszintes = !l.vizszintes; // mindig merolegesen keresztezunk

      for (var i = 0; i < l.szo.length; i++) {
        var betu = l.szo[i];
        // annak a cellanak a koordinatai, ahol a lerakott szo i. betuje all
        var cR = l.vizszintes ? l.sor : l.sor + i;
        var cC = l.vizszintes ? l.oszlop + i : l.oszlop;

        for (var j = 0; j < szo.length; j++) {
          if (szo[j] !== betu) continue;
          var sor = ujVizszintes ? cR : cR - j;
          var oszlop = ujVizszintes ? cC - j : cC;
          var ok = ellenoriz(racs, szo, sor, oszlop, ujVizszintes);
          if (!ok) continue;

          // Pontozas: sok metszes jo, a racs kozepe jo (tomorebb abra)
          var kozep = (racs.length - 1) / 2;
          var kozepR = ujVizszintes ? sor : sor + szo.length / 2;
          var kozepC = ujVizszintes ? oszlop + szo.length / 2 : oszlop;
          var tavolsag = Math.abs(kozepR - kozep) + Math.abs(kozepC - kozep);
          var pont = ok.metszesek * 12 - tavolsag + rnd() * 3;
          jeloltek.push({ sor: sor, oszlop: oszlop, vizszintes: ujVizszintes, pont: pont });
        }
      }
    }

    if (!jeloltek.length) return null;
    jeloltek.sort(function (a, b) { return b.pont - a.pont; });
    return jeloltek[0];
  }

  /* Egyetlen generalasi kiserlet: a jeloltekbol addig rakunk le szavakat,
   * amig el nem erjuk a celszamot. Ezert a jeloltlista jocskan nagyobb a
   * celnal - amelyik szo nem illeszkedik, azt egyszeruen atugorjuk. */
  function egyKiserlet(jeloltek, meret, rnd, cel) {
    var racs = racsKeszit(meret);
    var lerakottak = [];
    var hasznalt = {};

    // Hossz szerint csokkeno: a hosszu szavak adjak a vazat.
    var sorrend = jeloltek.slice().sort(function (a, b) {
      return b.answer.length - a.answer.length;
    });

    for (var i = 0; i < sorrend.length && lerakottak.length < cel; i++) {
      var tetel = sorrend[i];
      var szo = tetel.answer;
      if (hasznalt[szo]) continue;
      if (szo.length > meret) continue; // nem fer bele a racsba

      if (!lerakottak.length) {
        var sor = Math.floor(meret / 2);
        var oszlop = Math.floor((meret - szo.length) / 2);
        if (oszlop < 0) continue;
        beir(racs, szo, sor, oszlop, true);
        lerakottak.push({ szo: szo, tetel: tetel, sor: sor, oszlop: oszlop, vizszintes: true });
        hasznalt[szo] = true;
        continue;
      }

      var hely = legjobbHely(racs, szo, lerakottak, rnd);
      if (!hely) continue;
      beir(racs, szo, hely.sor, hely.oszlop, hely.vizszintes);
      lerakottak.push({
        szo: szo, tetel: tetel,
        sor: hely.sor, oszlop: hely.oszlop, vizszintes: hely.vizszintes
      });
      hasznalt[szo] = true;
    }

    return { racs: racs, lerakottak: lerakottak };
  }

  /* A kesz racsot a ténylegesen hasznalt teruletre vagja. */
  function levag(eredmeny) {
    var racs = eredmeny.racs;
    var minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (var r = 0; r < racs.length; r++) {
      for (var c = 0; c < racs.length; c++) {
        if (racs[r][c] != null) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (minR === Infinity) return { racs: [], szavak: [], sorok: 0, oszlopok: 0 };

    var sorok = maxR - minR + 1;
    var oszlopok = maxC - minC + 1;
    var uj = [];
    for (var i = 0; i < sorok; i++) {
      uj.push(racs[minR + i].slice(minC, maxC + 1));
    }
    var szavak = eredmeny.lerakottak.map(function (l) {
      return {
        szo: l.szo,
        definicio: l.tetel.clue,
        sor: l.sor - minR,
        oszlop: l.oszlop - minC,
        vizszintes: l.vizszintes
      };
    });
    return { racs: uj, szavak: szavak, sorok: sorok, oszlopok: oszlopok };
  }

  /* Szokezdo cellak megszamozasa a keresztrejtvenyeknel szokasos modon. */
  function szamoz(feladvany) {
    var pozicioSzam = {};
    var sorrend = feladvany.szavak.slice().sort(function (a, b) {
      return (a.sor - b.sor) || (a.oszlop - b.oszlop);
    });
    var kovetkezo = 1;
    sorrend.forEach(function (sz) {
      var kulcs = sz.sor + ',' + sz.oszlop;
      if (!(kulcs in pozicioSzam)) pozicioSzam[kulcs] = kovetkezo++;
      sz.szam = pozicioSzam[kulcs];
    });
    feladvany.szamok = pozicioSzam;
    feladvany.szavak = sorrend;
    feladvany.szavak.forEach(function (sz, i) { sz.id = i; });
    return feladvany;
  }

  /* Fo belepesi pont.
   * beallitas: { szavak: [[ANGOL, magyar], ...], darab, meret, mag } */
  function general(beallitas) {
    var keszlet = beallitas.szavak.map(function (s) {
      return { answer: s[0], clue: s[1] };
    });
    var darab = beallitas.darab || 18;
    var meret = beallitas.meret || 17;
    var mag = beallitas.mag != null ? beallitas.mag : (Math.random() * 1e9) | 0;

    // Csak olyan szo johet szoba, ami belefer a racsba.
    keszlet = keszlet.filter(function (t) { return t.answer.length <= meret; });

    // Bo jeloltlista kell, hogy a celszamot biztosan elerjuk.
    var jeloltSzam = Math.min(keszlet.length, Math.max(darab * 12, 150));

    var legjobb = null;
    // Tobb kiserlet, a legtobb szot elhelyezo racsot tartjuk meg.
    for (var kiserlet = 0; kiserlet < 8; kiserlet++) {
      var rnd = rngKeszit(mag + kiserlet * 7919);
      var valogatott = veletlenSorrend(keszlet, rnd).slice(0, jeloltSzam);

      var eredmeny = egyKiserlet(valogatott, meret, rnd, darab);
      if (!legjobb || eredmeny.lerakottak.length > legjobb.lerakottak.length) {
        legjobb = eredmeny;
      }
      if (legjobb.lerakottak.length >= darab) break;
    }

    var feladvany = levag(legjobb);
    feladvany.mag = mag;
    return szamoz(feladvany);
  }

  global.Keresztrejtveny = { general: general, rngKeszit: rngKeszit };
})(window);
