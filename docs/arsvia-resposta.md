# Resposta a ArsVia: requisits de la plataforma

Hola Joan,

He revisat el document amb calma. Primer et confirmo els quatre punts clau i després t'explico què es pot fer
directament, què necessita integracions externes i què convé deixar per a més endavant.

## Confirmació dels punts clau

1. **Gestió per oportunitats, no només per entitat.** Cada entitat (ajuntament, auditori, teatre, festival) tindrà
   la seva fitxa, i a dins hi haurà les oportunitats concretes: una subvenció, una licitació, un cicle o una proposta
   lliure. Una mateixa entitat pot tenir diverses oportunitats al llarg del temps sense que es considerin duplicats.
2. **Vistiplau humà obligatori.** El sistema només prepara esborranys. Cap correu surt sense la teva aprovació
   explícita. Si un correu queda programat, es pot cancel·lar amb un clic fins al moment de l'enviament.
3. **Els cinc moviments escrits.** Primera carta i quatre seguiments, separats uns 10 dies (configurable). Els 10 dies
   compten des de l'**enviament efectiu** de l'anterior, no des de la redacció ni de l'aprovació. Les alertes de
   trucada («Trucar a [Entitat] – 1a / 2a trucada de seguiment») es generen just després del **segon i del quart
   correu efectivament enviats**, mai per correus només redactats, aprovats o programats.
4. **Protecció de les relacions.**
   - Mai hi haurà dues seqüències actives per a la mateixa oportunitat i el mateix destinatari.
   - Si apareix una proposta nova per a una entitat que ja té una seqüència activa, el sistema t'ho mostrarà perquè
     decideixis si esperar, substituir-la o començar-ne una de nova.
   - Pots marcar a mà, en qualsevol moment, aquests estats: resposta rebuda, trucada feta, reunió prevista,
     interessat, no interessat, tornar a contactar més endavant.
   - Un «no vull rebre més comunicacions» anul·la la seqüència i queda registrat a la fitxa, i es respecta en el
     futur.
   - Si s'acaben els cinc moviments sense resposta, la seqüència s'arxiva sola.

## Què es pot desenvolupar directament amb l'arquitectura actual

La plataforma ja té una web publicada i comptes d'usuari, i descarrega cada dia les subvencions (BDNS) i els contractes
públics de música (Plataforma de Contractació). Damunt d'això es pot fer, sense serveis externs nous:

- **Fitxes del catàleg d'ArsVia**, amb tots els camps que demanes i l'estat «vigent / pendent d'actualització».
  - Quan una dada no estigui confirmada (pressupost, dates, requisits tècnics), es mostrarà com a provisional i no
    s'oferirà com a tancada.
  - Les fitxes que fa temps que no es revisen passaran a «pendent d'actualització».
- **Motor d'encaix amb els tres graus de certesa**, sempre visibles:
  - **Encaix potencial:** el proposa el sistema.
  - **Elegibilitat revisada:** la marques tu, quan has comprovat els requisits de la convocatòria.
  - **Finançament confirmat:** només amb resolució oficial. El sistema el pot detectar sol quan la BDNS publica la
    concessió a aquella entitat; si no, el marques tu amb l'enllaç a la resolució.
- **Sense historial conegut, un ventall ampli:** si no se sap què li agrada a una entitat, es proposa una selecció
  àmplia i ordenada del catàleg en lloc de descartar-la.
- **Generador d'esborranys** amb plantilles segons el tipus de destinatari, el repertori i l'oportunitat. Les
  subvencions s'hi esmenten com a suport opcional, amb el to que proposes.
- **Bústia d'aprovació**, des de l'ordinador o el mòbil: llegir, editar, aprovar o descartar cada missatge.
- **Seqüències dels cinc moviments**, amb:
  - les alertes de trucada;
  - el botó de cancel·lació;
  - els estats manuals;
  - el registre de baixa (opt-out);
  - l'arxiu automàtic;
  - el control d'una sola seqüència activa per oportunitat i destinatari.
- **Fitxa dinàmica de cada entitat:**
  - contacte;
  - propostes del catàleg que hi encaixen;
  - ajudes relacionades amb el seu grau de certesa;
  - historial complet (cartes, respostes, trucades, reunions);
  - estat de la relació i oportunitats i seqüències actives o tancades.
- **Panell d'Inici basat només en accions pendents:**
  - a qui trucar;
  - esborranys per revisar;
  - respostes i accions manuals;
  - oportunitats i ajudes noves que encaixen amb el catàleg;
  - contractes oberts d'interès.
- **Licitacions connectades amb el catàleg** (requisits, terminis, espectacles que hi encaixen, viabilitat
  preliminar o «pendent de valorar»). També una primera detecció d'**oportunitats de gestió integral de
  festivals**, a partir dels festivals i cicles que ja contracten els municipis. Al teu document són de la fase 2,
  però les dades ja hi són.
- **Diversos perfils:** cada compte té el seu catàleg, les seves entitats i les seves seqüències. Així l'eina també
  pot servir per a altres productores.

## Què requereix integracions externes

- **L'enviament efectiu des de la bústia d'ArsVia.** Perquè els correus surtin de la teva adreça i les respostes
  t'arribin a tu, cal connectar la teva bústia de correu: Gmail, Outlook o el servidor de correu d'arsvia.org.
  - Mentre no estigui connectada, el sistema obrirà el correu ja redactat al teu programa de correu. Quan l'enviïs,
    hi marques «enviat», i a partir d'aquell moment compten els 10 dies.
  - **Programar enviaments** (que surtin sols a una hora concreta, amb possibilitat de cancel·lar) necessita aquesta
    connexió.
- **La detecció automàtica de respostes.** Cal llegir la bústia d'entrada. Els missatges automàtics (fora
  d'oficina, avisos de lliurament, errors de correu) es poden reconèixer pels senyals tècnics que porten i no
  aturaran la seqüència. Fins que estigui connectada, les respostes es marquen a mà.
- **La lectura automàtica del catàleg d'arsvia.org.** Si la web té una estructura clara, es pot importar i
  revisar-ne la vigència periòdicament. Si no, les fitxes s'omplen a la plataforma, o des d'un full de càlcul que em
  passis.

Cap d'aquestes integracions té cost per a volums com els vostres. Totes necessiten que tu autoritzis l'accés a la teva
bústia o a la web.

## Què convé abordar en fases posteriors

- **Estadístiques de conversió:** cartes enviades, respostes, reunions i concerts tancats, per tipus d'entitat i de
  proposta.
- **Alertes de noves convocatòries sobre oportunitats que ja estan en marxa.**
- **Millores visuals i de gestió des del mòbil.** La web ja es pot fer servir al mòbil; es pot afinar més.
- **La detecció automàtica de respostes**, si no es connecta la bústia des del principi.

## El que necessito de tu

1. **Quin correu fas servir per a ArsVia:** Gmail, Outlook/Microsoft 365 o un servidor propi. Així sabré com
   connectar-lo.
2. **El catàleg:** si les fitxes es poden treure de la web o si prefereixes passar-me un full de càlcul amb els camps
   del punt B (nom, tipus, format, requisits, preu orientatiu, disponibilitat, àmbit, enllaç).
3. **L'idioma de les cartes:** proposo castellà per defecte i català per a les entitats de Catalunya. També
   necessito la signatura que vols fer servir.
4. **La pauta dels 10 dies:** si la vols igual per a tothom, o més llarga a l'estiu i per Nadal.

Començo ja per la fase 1. Tot el que necessita el correu connectat funcionarà de manera manual mentre no el connectem.

Una abraçada,

Biel
