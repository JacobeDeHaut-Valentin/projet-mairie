export const groups = [
  { id: "finances", name: "Finances" },
  { id: "travaux", name: "Travaux" },
  { id: "enfance", name: "Enfance" },
  { id: "numerique", name: "Numérique" }
];

export function getGroupName(id) {
  return groups.find(g => g.id === id)?.name || id;
}