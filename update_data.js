const fs = require('fs');
let data = fs.readFileSync('src/lib/mock/data.ts', 'utf-8');

// 1. Add MP interface
data = data.replace('export interface Project {', `export interface MP {
  id: string;
  name: string;
  house: "Lok Sabha" | "Rajya Sabha";
  memberStatus: "Sitting" | "Former";
  state: string;
  constituency: string;
  memberStartDate: string;
  memberEndDate: string;
}

export interface Project {`);

// 2. Add mpId and mpName to Project
data = data.replace('  id: string;\n  name: string;', '  id: string;\n  mpId: string;\n  mpName: string;\n  name: string;');

// 3. Add predefined MPs and modify buildProjects
const predefinedMPs = `
export const mps: MP[] = [];
for (const state of STATES) {
  const districts = DISTRICTS[state] || [];
  for (const dist of districts) {
    mps.push({
      id: \`MP-\${mps.length + 1}\`,
      name: \`Shri \${dist} MP\`,
      house: "Lok Sabha",
      memberStatus: "Sitting",
      state: state,
      constituency: CONSTITUENCIES[dist] || dist,
      memberStartDate: "2019-05-23",
      memberEndDate: "2024-05-23"
    });
  }
}
// Add some Rajya Sabha MPs
for (const state of STATES) {
  mps.push({
    id: \`MP-\${mps.length + 1}\`,
    name: \`Smt. \${state} RS Member\`,
    house: "Rajya Sabha",
    memberStatus: "Sitting",
    state: state,
    constituency: state, // Rajya Sabha represents the state
    memberStartDate: "2020-04-03",
    memberEndDate: "2026-04-02"
  });
}
`;

data = data.replace('function buildProjects(): Project[] {', predefinedMPs + '\nfunction buildProjects(): Project[] {');

// 4. Update the three canonical records
data = data.replace('    id: "MPL-1842",\n    name: "Construction of Community Health Centre",', '    id: "MPL-1842",\n    mpId: "MP-1",\n    mpName: "Shri Patna MP",\n    name: "Construction of Community Health Centre",');
data = data.replace('    id: "MPL-5821",\n    name: "Rural Road Improvement",', '    id: "MPL-5821",\n    mpId: "MP-5",\n    mpName: "Shri Lucknow MP",\n    name: "Rural Road Improvement",');
data = data.replace('    id: "MPL-2391",\n    name: "Construction of Community Hall",', '    id: "MPL-2391",\n    mpId: "MP-33",\n    mpName: "Shri North Delhi MP",\n    name: "Construction of Community Hall",');

// 5. Update the random generation loop
data = data.replace('    const [lat, lng] = base;', `    const [lat, lng] = base;
    const constituency = CONSTITUENCIES[district] ?? district;
    const possibleMps = mps.filter(m => m.state === state && (m.constituency === constituency || m.house === "Rajya Sabha"));
    const mp = possibleMps[Math.floor(rnd() * possibleMps.length)] || mps[0];
`);
data = data.replace('      name: NAMES[Math.floor(rnd() * NAMES.length)]!,', `      mpId: mp.id,
      mpName: mp.name,
      name: NAMES[Math.floor(rnd() * NAMES.length)]!,`);

fs.writeFileSync('src/lib/mock/data.ts', data, 'utf-8');
console.log('Updated data.ts');
