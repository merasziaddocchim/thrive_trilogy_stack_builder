// Aggregates all schema layers. Import this everywhere the full schema is needed.
// Structure mirrors TECH_DOCS §1's three-layer model, kept in separate files so
// raw literature facts, editorial synthesis, and consumer numbers stay separated.
export * from './enums.js';
export * from './layer1_source.js';
export * from './layer2_compound.js';
export * from './layer3_scoring.js';
export * from './user.js';
