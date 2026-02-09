import { App, HelmProps } from "@/services/AppController";

/**
 * 解析JSON配置，提取所有字段的helm映射规则
 * @param config 应用配置（App类型）
 * @returns 表单字段名 -> helm映射规则的映射表
 */
export const getHelmMappings = (config: App): Record<string, HelmProps> => {
    return config.app_field_configs.reduce((mappings, field) => {
        if (field.helm_props) {
            mappings[field.name] = field.helm_props;
        }
        return mappings;
    }, {} as Record<string, HelmProps>)
};

/**
 * 将表单数据转换为helm --set参数
 * @param formData 表单数据（FormData类型）
 * @param config 应用配置（App类型）
 * @returns helm --set 格式的参数字符串
 */
export const formDataToHelmSet = (formData: Record<string, any>, config: App): string => {
    const mappings = getHelmMappings(config);
    const setParams: string[] = [];

    Object.entries(formData).forEach(([key, value]) => {
        const mapping = mappings[key];
        if (!mapping || value === undefined || value === null) return;

        const { keys, type, unit = '' } = mapping;
        let processedValue: string = String(value);

        switch (type) {
            case 'boolean':
                processedValue = value ? "True" : "False";
                break;
            case 'number':
                processedValue = `${value}${unit}`;
                break;
            case 'string':
            default:
                // 字符串原样保留（特殊字符可按需转义）
                break;
        }
        keys.forEach((key) => setParams.push(`${key}=${processedValue}`))
    });

    return setParams.join(',');
};