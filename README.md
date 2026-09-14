# Angol szókincs keresztrejtvény

Keresztrejtvény-gyakorló a saját mentett angol–magyar szószedetemből. A magyar
meghatározáshoz az **angol** szót kell beírni a rácsba. Minden indításnál új,
véletlenszerűen generált feladvány készül a **1274 szavas** szótárból, így
ugyanaz a szókészlet sokszor átgyakorolható.

Nincs build-lépés, nincs függőség: sima HTML + CSS + JavaScript.

## Indítás localhoston

```bash
./serve.sh          # http://localhost:8000
./serve.sh 9000     # másik porton
```

Vagy közvetlenül:

```bash
python3 -m http.server 8000
```

Ezután nyisd meg: <http://localhost:8000>

> A `file://` megnyitás is működik (nincs `fetch`, minden adat be van ágyazva),
> de a helyi kiszolgáló a javasolt út.

## Használat

| Művelet | Billentyű |
|---|---|
| Betű beírása | betűbillentyűk |
| Irányváltás (vízszintes ⇄ függőleges) | `Szóköz`, vagy kattintás az aktív cellára |
| Mozgás a rácson | `↑` `↓` `←` `→` |
| Törlés / visszalépés | `Backspace`, `Delete` |
| Következő meghatározás | `Enter` vagy `Tab` (`Shift` = vissza) |

Gombok: **Ellenőrzés** (a hibás betűket pirossal jelöli), **Betű felfedése**,
**Szó felfedése**, **Teljes megoldás**, **Törlés**, **Nyomtatás** (üres rácsot
nyomtat a meghatározásokkal, papíros kitöltéshez).

Négy nehézségi szint: Könnyű (12 szó), Közepes (18), Nehéz (26), Profi (34).
A megoldott rejtvények száma a böngésző `localStorage`-ában marad meg.

## Felépítés

```
index.html         a felület váza
css/style.css      megjelenés (világos/sötét mód, nyomtatási nézet)
js/data.js         a szószedet: 1274 [ANGOL, magyar] pár
js/crossword.js    a rácsgeneráló motor
js/app.js          a játéklogika és a felhasználói felület
serve.sh           helyi kiszolgáló
```

### A rácsgenerálás

1. Bő jelöltlistát húz a szószedetből, és hossz szerint csökkenő sorrendbe rakja.
2. Az első (leghosszabb) szó a rács közepére kerül vízszintesen.
3. Minden további szót a már lerakott szavakkal alkotott **betűmetszésekbe**
   próbál illeszteni; a jelölt helyeket a metszések száma és a rács közepétől
   mért távolság alapján pontozza.
4. Egy elhelyezés csak akkor érvényes, ha a szó előtt és után üres a cella, és
   az újonnan beírt betűk merőleges szomszédai is üresek — így nem keletkezik
   véletlen, értelmetlen betűsor a rácsban.
5. A kész rácsot a ténylegesen használt területre vágja és megszámozza.

A generátor addig rak le szavakat, amíg el nem éri a szint célszámát, és több
próbálkozásból a legjobbat tartja meg. A négy szint mindegyike a tesztekben
100%-ban kitöltött, érvényes rácsot adott.

## A szószedet

A `js/data.js` a mentett fordításokat tartalmazó táblázatból készült. A
feldolgozás:

- oszloponként eldönti, melyik oldal az angol és melyik a magyar (a rendszer
  angol szótárával, a magyar ékezetes karakterekkel korrigálva) — a forrásban
  ugyanis mindkét irány előfordul;
- csak az egyszavas, tisztán betűkből álló, 3–14 karakteres angol megfejtéseket
  tartja meg, amelyek valódi szótári alakok (így a forrás elgépelései kiesnek);
- a duplikátumokat kiszűri.

Az 1891 eredeti sorból így 1274 keresztrejtvénybe illő szó maradt. A kihagyottak
többsége egész mondat vagy többszavas kifejezés, amely rácsba nem fér bele.

## Licenc

MIT — lásd a [LICENSE](LICENSE) fájlt.
