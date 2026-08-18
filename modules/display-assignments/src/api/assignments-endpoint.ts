export async function getAssignmentsJson() {
  return {
    generatedAt: new Date().toISOString(),
    assignments: []
  };
}
