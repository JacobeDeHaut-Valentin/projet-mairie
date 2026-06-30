export const groups = [
  { id: 'finances', name: 'Finances' },
  { id: 'travaux', name: 'Travaux' },
  { id: 'enfance', name: 'Enfance' },
  { id: 'numerique', name: 'Numérique' },
  { id: 'action-sociale', name: 'Action sociale' }
];

export function getGroupName(id) {
  return groups.find((group) => group.id === id)?.name || id;
}
