const fs = require('fs');
const path = require('path');

// Función para generar la tabla de posiciones
function generateStandings(matches, rules) {
  const standings = {};

  matches.forEach((match) => {
    const teams = match.teams;
    const home_events = match.home_events;
    const away_events = match.away_events;

    // Verificar si los equipos existen en la tabla de posiciones y agregarlos si no existen
    if (!standings.hasOwnProperty(teams.home)) {
      standings[teams.home] = {
        points: 0,
        bonusPoints: 0,
        matchesPlayed: 0,
        goalsFor: 0,
      };
    }

    if (!standings.hasOwnProperty(teams.away)) {
      standings[teams.away] = {
        points: 0,
        bonusPoints: 0,
        matchesPlayed: 0,
        goalsFor: 0,
      };
    }

    // Aplicar los eventos y contarlos
    applyEvents(home_events, teams.home, standings, rules);
    applyEvents(away_events, teams.away, standings, rules);

    // Incrementar los partidos jugados
    standings[teams.home].matchesPlayed++;
    standings[teams.away].matchesPlayed++;
  });

  return standings;
}

// Función para aplicar los eventos y las reglas a un equipo específico
function applyEvents(events, team, standings, rules) {
  events.forEach((event) => {
    if (event.event === 'score') {
      standings[team].goalsFor++;
      applyRules(event, team, standings, rules);
    }
  });
}

// Función para aplicar las reglas a un evento y equipo específico
function applyRules(event, team, standings, rules) {
  const eventType = event.event;

  rules.forEach((rule) => {
    const ruleEvent = rule.event;
    const condition = rule.condition;

    if (ruleEvent === eventType) {
      if (condition && checkCondition(condition)) {
        if (rule.type === 'match') {
          standings[team].points += rule.points;
        } else if (rule.type === 'side') {
          standings[team].bonusPoints += rule.bonus_points;
        } else if (rule.type === 'single' || rule.type === 'special') {
          standings[team].bonusPoints += rule.bonus_points;
        }
      }
    }
  });

  // Actualizar puntos totales sumando los puntos y puntos de bonificación
  standings[team].points += standings[team].bonusPoints;
}

// Función para contar eventos que cumplen una condición
function countEventsByCondition(team, condition, standings) {
  const events = getAllEventsByTeam(team, standings);

  let count = 0;

  events.forEach((event) => {
    if (
      (!condition.player || event.player === condition.player) &&
      (!condition.distance || checkDistance(event, condition.distance)) &&
      (!condition.after_time || checkAfterTime(event, condition.after_time))
    ) {
      count++;
    }
  });

  return count;
}

// Función para obtener todos los eventos de un equipo
function getAllEventsByTeam(team, standings) {
  const events = [];

  Object.values(standings).forEach((teamData) => {
    if (teamData.events) {
      events.push(...teamData.events);
    }
  });

  return events;
}

// Función para verificar si se cumple una condición de distancia
function checkDistance(event, distance) {
  const obs = event.obs;

  if (distance.startsWith('+')) {
    const minDistance = parseInt(distance.slice(1), 10);
    return obs === 'afuera del area' && event.time.endsWith('+0') && event.distance >= minDistance;
  }

  if (distance.startsWith('-')) {
    const maxDistance = parseInt(distance.slice(1), 10);
    return event.distance <= maxDistance;
  }

  return false;
}

// Función para verificar si se cumple una condición de tiempo
function checkAfterTime(event, after_time) {
  const time = event.time;

  if (after_time.includes('+')) {
    const minutes = parseInt(after_time.split(' ')[0], 10);
    const isAddedTime = after_time.endsWith('+0');
    const eventTime = parseInt(time.split(' ')[0], 10);

    if (isAddedTime) {
      return eventTime >= minutes && eventTime <= 45;
    }

    return eventTime >= minutes;
  }

  return false;
}

// Función para verificar una condición general
function checkCondition(condition) {
  const at_least = condition.at_least;

  return at_least > 0;
}

// Leer los archivos JSON de la carpeta 'data'
const dataFolderPath = path.join(__dirname, 'data');
const fileNames = fs.readdirSync(dataFolderPath);

const matches = fileNames.map((fileName) => {
  const filePath = path.join(dataFolderPath, fileName);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

// Definir las reglas directamente en el código
const rules = [
  {
    name: 'two_points_on_win',
    type: 'match',
    event: 'win',
    points: 2,
  },
  {
    name: 'late_goals',
    type: 'single',
    event: 'score',
    condition: {
      after_time: '90 +0',
    },
    bonus_points: 1,
  },
  {
    name: 'keeper_goal',
    type: 'particular',
    event: 'score',
    condition: {
      player: 'goalkeeper',
    },
    bonus_points: 2,
  },
  {
    name: 'scoring',
    type: 'side',
    event: 'score',
    condition: {
      at_least: 3,
    },
    bonus_points: 1,
  },
];

// Generar la tabla de posiciones
const standings = generateStandings(matches, rules);

// Mostrar la tabla de posiciones en formato JSON
console.log(JSON.stringify(standings, null, 2));
