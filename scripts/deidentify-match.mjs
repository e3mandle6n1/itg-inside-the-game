#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "public", "match.json");

const people = [
  ["Ancelotti, Davide", "Maren, Luca", "Davide Ancelotti", "Luca Maren"],
  ["Arteta, Mikel", "Voss, Elias", "Mikel Arteta", "Elias Voss"],
  ["Zwayer, Felix", "Cole, Adrian", "Felix Zwayer", "Adrian Cole"],
  ["Arrizabalaga, Kepa", "Varela, Enzo", "Kepa Arrizabalaga", "Enzo Varela"],
  ["Bakwa, Dilane", "Ndiaye, Kofi", "Dilane Bakwa", "Kofi Ndiaye"],
  ["Bentaleb, Nabil", "Farouk, Samir", "Nabil Bentaleb", "Samir Farouk"],
  ["Calafiori, Riccardo", "Bellini, Marco", "Riccardo Calafiori", "Marco Bellini"],
  ["Cossier, Isaac", "Wren, Theo", "Isaac Cossier", "Theo Wren"],
  ["Diaoune, Soriba", "Keita, Amadou", "Soriba Diaoune", "Amadou Keita"],
  ["Dowman, Max", "Pell, Noah", "Max Dowman", "Noah Pell"],
  ["Eze, Eberechi", "Okonkwo, Chidi", "Eberechi Eze", "Chidi Okonkwo"],
  ["Gill, Orlando", "Marsh, Leo", "Orlando Gill", "Leo Marsh"],
  ["Giroud, Olivier", "Durand, Remy", "Olivier Giroud", "Remy Durand"],
  ["Goffi, Maxima Adeagan", "Okello, Juma", "Maxima Adeagan Goffi", "Juma Okello"],
  ["Guimaraes, Bruno", "Santos, Paulo", "Bruno Guimaraes", "Paulo Santos"],
  ["Gyokeres, Viktor", "Lindqvist, Nils", "Viktor Gyokeres", "Nils Lindqvist"],
  ["Haraldsson, Hakon Arnar", "Bjornsson, Ari", "Hakon Arnar Haraldsson", "Ari Bjornsson"],
  ["Hashi, Maalik Hakeem Mohamed", "Yusuf, Amir", "Maalik Hakeem Mohamed Hashi", "Amir Yusuf"],
  ["Havertz, Kai", "Weber, Lars", "Kai Havertz", "Lars Weber"],
  ["Kjaergaard, Maurits", "Holm, Soren", "Maurits Kjaergaard", "Soren Holm"],
  ["Konsa, Ezri", "Dane, Ezra", "Ezri Konsa", "Ezra Dane"],
  ["Lewis-Skelly, Myles", "Quinn, Miles", "Myles Lewis-Skelly", "Miles Quinn"],
  ["Madueke, Noni", "Adeyemi, Tunde", "Noni Madueke", "Tunde Adeyemi"],
  ["Magalhaes, Gabriel", "Costa, Rafael", "Gabriel Magalhaes", "Rafael Costa"],
  ["Merino, Mikel", "Navarro, Diego", "Mikel Merino", "Diego Navarro"],
  ["Meslier, Illan", "Petit, Hugo", "Illan Meslier", "Hugo Petit"],
  ["Mosquera, Cristhian", "Rojas, Mateo", "Cristhian Mosquera", "Mateo Rojas"],
  ["Mukau, Ngalayel", "Banza, Yves", "Ngalayel Mukau", "Yves Banza"],
  ["Ngoy, Nathan", "Mwangi, Joel", "Nathan Ngoy", "Joel Mwangi"],
  ["Nianzou, Tanguy", "Diallo, Sekou", "Tanguy Nianzou", "Sekou Diallo"],
  ["O'Neill, Ceadach Liam", "Byrne, Finn", "Ceadach Liam O'Neill", "Finn Byrne"],
  ["Odegaard, Martin", "Kessler, Jonas", "Martin Odegaard", "Jonas Kessler"],
  ["Onal, Basar", "Demir, Emre", "Basar Onal", "Emre Demir"],
  ["Ozer, Berke", "Yilmaz, Can", "Berke Ozer", "Can Yilmaz"],
  ["Perraud, Romain", "Lefevre, Anton", "Romain Perraud", "Anton Lefevre"],
  ["Perrin, Gaetan", "Moreau, Luc", "Gaetan Perrin", "Luc Moreau"],
  ["Raya, David", "Ortega, Marcos", "David Raya", "Marcos Ortega"],
  ["Ribeiro, Alexsandro", "Ferreira, Tiago", "Alexsandro Ribeiro", "Tiago Ferreira"],
  ["Rice, Declan", "Hayes, Owen", "Declan Rice", "Owen Hayes"],
  ["Sahraoui, Osame", "Haddad, Karim", "Osame Sahraoui", "Karim Haddad"],
  ["Sajous, Thomas", "Blanc, Etienne", "Thomas Sajous", "Etienne Blanc"],
  ["Saka, Bukayo", "Okoro, Tayo", "Bukayo Saka", "Tayo Okoro"],
  ["Salmon, Marli", "Reed, Jordan", "Marli Salmon", "Jordan Reed"],
  ["Srdanovic, Loun", "Petrov, Luka", "Loun Srdanovic", "Luka Petrov"],
  ["Timber, Jurrien", "Dekker, Niels", "Jurrien Timber", "Niels Dekker"],
  ["Ueda, Ayase", "Sato, Ren", "Ayase Ueda", "Ren Sato"],
  ["Verdonk, Calvin", "Bosch, Erik", "Calvin Verdonk", "Erik Bosch"],
  ["White, Ben", "Clarke, Adam", "Ben White", "Adam Clarke"],
  ["Andre, Benjamin", "Holt, Micah", "Benjamin Andre", "Micah Holt"],
];

const teams = [
  ["Arsenal FC", "Northbridge FC"],
  ["Lille OSC", "Rivermark SC"],
  ["Arsenal", "Northbridge"],
  ["Lille", "Rivermark"],
  ["UEFA Champions League", "Continental Cup"],
  ["Emirates Stadium", "Harbor View Arena"],
  ["London", "Harbor City"],
  ["ARS", "NB"],
  ["LIL", "RV"],
];

const standings = [
  ["Barcelona", "Costa Alta"],
  ["Sporting CP", "Atlantic SC"],
  ["Bayern Munich", "Isar United"],
  ["PSG", "Seine FC"],
  ["Como", "Lario FC"],
  ["Manchester United", "Irwell Athletic"],
  ["Stuttgart", "Neckar FC"],
  ["Manchester City", "Medlock City"],
  ["Villarreal", "Castello CF"],
  ["Aston Villa", "Claret Rovers"],
  ["Real Betis", "Verde Sevilla"],
  ["Atletico", "Capital Atletico"],
  ["Dortmund", "Ruhr Yellows"],
  ["Liverpool", "Mersey FC"],
  ["Real Madrid", "Castilla CF"],
  ["AEK Athens", "Attica AEK"],
  ["Club Brugge", "Canal Brugge"],
  ["Lens", "Artois FC"],
  ["Leipzig", "Elster FC"],
  ["Sabah Masazir", "Caspian Sabah"],
  ["Roma", "Tiber Roma"],
  ["Shakhtar", "Donets FC"],
  ["Fenerbahce", "Bosphorus SK"],
  ["Eindhoven", "Brabant PSV"],
  ["Viking", "Fjord Viking"],
  ["LASK", "Danube LASK"],
  ["Inter", "Navigli Inter"],
  ["Porto", "Douro FC"],
  ["Slavia Prague", "Vltava Slavia"],
  ["Napoli", "Bay Naples"],
  ["Feyenoord", "Maas Feyenoord"],
  ["Galatasaray", "Golden Horn SK"],
  ["Slovan Bratislava", "Danube Slovan"],
  ["Bodoe/Glimt", "Arctic Glimt"],
];

const formCodes = [
  ["LEE", "HAL"],
  ["BRI", "CLI"],
  ["IPS", "ORW"],
  ["SUN", "TYN"],
  ["HAC", "SEN"],
  ["NIC", "AZU"],
  ["EST", "VAL"],
  ["RBB", "SAL"],
];

function applyMap(text, pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    if (!from) continue;
    out = out.split(from).join(to);
  }
  return out;
}

const peoplePairs = [];
for (const [csvFrom, csvTo, naturalFrom, naturalTo] of people) {
  peoplePairs.push([csvFrom, csvTo], [naturalFrom, naturalTo]);
  const fakeFirst = csvTo.split(", ")[1];
  const realFirst = csvFrom.split(", ")[1];
  // multi-word first names already covered by natural form
  if (realFirst && !realFirst.includes(" ") && fakeFirst) {
    // avoid tiny tokens
  }
}
peoplePairs.sort((a, b) => b[0].length - a[0].length);

const teamPairs = [...teams, ...standings, ...formCodes].sort(
  (a, b) => b[0].length - a[0].length,
);

let raw = readFileSync(path, "utf8");
raw = applyMap(raw, peoplePairs);
raw = applyMap(raw, teamPairs);
raw = raw
  .replaceAll("/icons/arsenal.png", "/icons/jersey-home.svg")
  .replaceAll("/icons/lille.png", "/icons/jersey-away.svg");

const match = JSON.parse(raw);
match.home = {
  ...match.home,
  name: "Northbridge",
  short: "NB",
  crest: "/icons/jersey-home.svg",
};
match.away = {
  ...match.away,
  name: "Rivermark",
  short: "RV",
  crest: "/icons/jersey-away.svg",
};
match.competition = "Continental Cup";

writeFileSync(path, `${JSON.stringify(match)}\n`);
console.log("deidentified", path);
