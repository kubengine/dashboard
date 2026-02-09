
interface formatResult {
    value: number
    unit: string
}
export const formatBytes = (bytes: number): formatResult => {
    const units = ["B", "Ki", "Mi", "Gi", "Ti"];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return {
        value: Number(value.toFixed(2)),
        unit: units[unitIndex]
    }
};
