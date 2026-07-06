export const releaseControlsReadbackRow = Object.freeze(["controls", "Controls"]);

export function releaseControlsReadbackData(data = {}) {
  const value = data.controls || {};
  return value.releaseControls || value.controls || value;
}
