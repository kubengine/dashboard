import { parse } from "yaml";

/**
 * 递归遍历对象，将嵌套键拼接为点分隔的 Properties 格式
 * @param obj 解析后的 YAML JSON 对象
 * @param parentKey 父级键（用于递归拼接）
 * @returns 键值对数组 [key, value]
 */
function flattenObject(
    obj: Record<string, any>,
    parentKey: string = ''
): [string, any][] {
    let result: [string, any][] = [];

    for (const [key, value] of Object.entries(obj)) {
        const currentKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result = result.concat(flattenObject(value, currentKey));
        } else {
            const finalValue = value === null || value === undefined
                ? ''
                : typeof value === 'boolean' || typeof value === 'number'
                    ? String(value)
                    : value;
            result.push([currentKey, finalValue]);
        }
    }

    return result;
}

/**
 * 将 YAML 字符串转换为 Properties 格式字符串
 * @param yamlStr YAML 字符串
 * @returns Properties 格式字符串
 */
export function yamlToProperties(yamlStr: string): [string, any][] {
    try {
        // 核心修改：用 parse 替代 load
        const yamlObj = parse(yamlStr) as Record<string, any>;
        if (typeof yamlObj !== 'object' || yamlObj === null) {
            throw new Error('YAML 解析结果不是有效对象');
        }

        return flattenObject(yamlObj);
        // return flattened.map(([key, value]) => `${key}=${value}`).join('\n');
    } catch (error) {
        console.error('YAML 转换 Properties 失败：', error);
        throw error;
    }
}