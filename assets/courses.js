'use strict';
// A punched ticket records a sequence of real, on-time dispatches.
window.COURSES = [
  {
    title: 'Die letzte Vorstellung',
    stops: ['bus', 'tram'],
    owner: 'Ein Kinovorführer',
    story: 'Sein Film endet um 00:13. Heute erreicht er zum ersten Mal den letzten Wagen nach Hause.',
    mark: 'Kinokarte',
  },
  {
    title: 'Frühstück am Kai',
    stops: ['tram', 'metro', 'bus'],
    owner: 'Die Bäckerin vom Kai',
    story: 'Im Nachtbus riecht es nach warmen Zimtschnecken. Eine bleibt für das Stellwerk.',
    mark: 'Bäckermarke',
  },
  {
    title: 'Stimmen auf Band',
    stops: ['metro', 'zug', 'tram'],
    owner: 'Zwei Tonjägerinnen',
    story: 'Auf der Kassette hört man drei Türen und ganz am Ende ein Lachen.',
    mark: 'Tonband',
  },
  {
    title: 'Blumen für Gleis vier',
    stops: ['express', 'bus', 'zug'],
    owner: 'Ein Mann mit Nelken',
    story: 'Der Strauß ist zu breit für die Tür. Für einen Augenblick hält die ganze Schlange den Atem an.',
    mark: 'Rote Nelke',
  },
  {
    title: 'Brief ans andere Ufer',
    stops: ['faehre', 'tram', 'faehre'],
    owner: 'Die Fährfrau',
    story: 'Am Morgen liegt der Antwortbrief unter dem Fahrplan. Der Umschlag riecht nach Salz.',
    mark: 'Ankerstempel',
  },
  {
    title: 'Die Sternwarte',
    stops: ['flug', 'metro', 'express'],
    owner: 'Ein Kind mit Fernrohr',
    story: 'Als die Kuppel aufgeht, ist der Himmel gerade noch dunkel genug für Saturn.',
    mark: 'Sternkarte',
  },
  {
    title: 'Sonderausgabe',
    stops: ['post', 'bus', 'tram', 'post'],
    owner: 'Die Nachtredaktion',
    story:
      'Die erste gedruckte Zeitung landet auf deiner Fensterbank. Unter Vermischtes steht dein Bahnhof.',
    mark: 'Druckstock',
  },
  {
    title: 'Echo im Basistunnel',
    stops: ['tunnel', 'metro', 'tunnel'],
    owner: 'Eine Geigerin',
    story: 'Der letzte Ton hängt noch zwischen den Kacheln, als der Zug längst verschwunden ist.',
    mark: 'Stimmgabel',
  },
  {
    title: 'Das stille Paket',
    stops: ['magnet', 'post', 'express'],
    owner: 'Der Uhrmacher',
    story:
      'Im Paket tickt eine Bahnhofsuhr. Sie wird genau in dem Moment ausgeladen, in dem die volle Stunde schlägt.',
    mark: 'Zifferblatt',
  },
  {
    title: 'Nordlichtfenster',
    stops: ['pol', 'faehre', 'pol'],
    owner: 'Drei müde Forscher',
    story: 'Mitten auf der Fähre wird es still. Über dem Wasser zieht ein grünes Band bis zum Horizont.',
    mark: 'Polarstern',
  },
  {
    title: 'Eine Nacht, zwei Meere',
    stops: ['kontinental', 'zug', 'ozean', 'faehre'],
    owner: 'Eine Reisende ohne Gepäck',
    story:
      'Auf der Rückseite ihrer Karte zeichnet sie einen winzigen Leuchtturm. Er steht jetzt in deinem Dienstbuch.',
    mark: 'Leuchtfeuer',
  },
  {
    title: 'Der Nebelwärter',
    stops: ['meerbruecke', 'faehre', 'meerbruecke'],
    owner: 'Ein Wärter mit Öllampe',
    story:
      'Zwischen den Brückenpfeilern blinkt ein Licht. Zum Dank antwortet dein Stellwerk mit zwei kurzen Signalen.',
    mark: 'Öllampe',
  },
  {
    title: 'Fracht ohne Gewicht',
    stops: ['fracht', 'stratosphaere', 'post'],
    owner: 'Eine Pilotin mit Aktentasche',
    story:
      'Die Aktentasche enthält eine einzige Feder. Auf dem Begleitschein stehen ihr Gewicht auf der Erde und ihr Gewicht über den Wolken.',
    mark: 'Flugfeder',
  },
  {
    title: 'Die schiefe Sekunde',
    stops: ['kontinentalring', 'versuch', 'vakuum'],
    owner: 'Zwei Messtechniker',
    story: 'Die Messuhren zeigen zum ersten Mal dieselbe Zeit. Niemand weiß, wer zuerst applaudiert hat.',
    mark: 'Sekundenzeiger',
  },
  {
    title: 'Das Polararchiv',
    stops: ['zubringer', 'polarring', 'pol'],
    owner: 'Eine Bibliothekarin',
    story:
      'Ihre Kisten sind voller Fahrpläne von Orten, die es längst nicht mehr gibt. Heute leiht sie dir den schönsten.',
    mark: 'Archivschlüssel',
  },
  {
    title: 'Die erste Frühschicht',
    stops: ['horizont', 'tram', 'bus', 'horizont'],
    owner: 'Das Personal der Frühschicht',
    story:
      'Die Ablösung kommt mit Kaffee. Unten an der Tür steht noch jemand, der eine letzte Runde drehen möchte.',
    mark: 'Morgensonne',
  },
];
