import { request } from "@umijs/max";
import { FormItemProps } from "antd";
import { Variant } from "antd/es/config-provider";
import { RuleObject } from "antd/es/form";

export interface App {
    app_id?: number;
    name: string;
    category: string[];
    description: string;
    helm_chart: string;
    create_time?: string;
    app_field_configs: AppFieldConfig[];
}

export interface HelmProps {
    type: string;
    keys: string[];
    unit?: string;
}

export interface AppFieldConfig {
    // 基础标识
    field_id?: string;
    config_type: string;
    name: string;
    label: string;
    extra: string;
    order: number;
    initial_value: any;

    // 字段类型
    type:
    | 'text'
    | 'password'
    | 'number'
    | 'select'
    | 'radio'
    | 'switch'
    | 'textarea';

    // 表单项属性（使用官方 FormItemProps，排除已单独定义的字段）
    form_item_props: Omit<FormItemProps, 'name' | 'label' | 'rules'>;

    // 验证规则（使用官方 Rule 类型）
    rules: RuleObject[];


    // 字段特定属性
    field_props: {
        // 文本/密码/文本域通用
        placeholder?: string;
        prefix?: React.ReactNode;
        allowClear?: boolean;
        showCount?: boolean;
        variant?: Variant;

        // 数字类型专属
        min?: number;
        max?: number;
        step?: number;

        // 选择器专属
        options?: Array<{ label: string | number; value: string | number }>;
        selectMode?: 'multiple' | 'tags';

        // 任意其他自定义属性（兜底）
        [key: string]: any;
    };
    // helm 关联配置属性
    helm_props?: HelmProps;
    // 任意其他自定义属性（兜底）
    [key: string]: any;
}

export const get_init_field_config = (): AppFieldConfig => {
    return {
        config_type: "",
        name: "",
        label: "",
        extra: "",
        order: 0,
        initial_value: "",
        type: "text",
        form_item_props: {},
        rules: [],
        field_props: {
            placeholder: "",
            prefix: "",
            allowClear: false,
        },
        helm_props: { type: "string", keys: [] },
        init: true,
    }
}

export async function list(name: string, page_size: number, page: number) {
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    if (name && name.trim()) {
        params.name = name.trim();
    }
    return request<API.Result>(`/api/v1/app/list`, { method: 'GET', params });
}

export async function get_app_by_id(app_id: number) {
    return request<API.Result>(`/api/v1/app/get/${app_id}`, { method: 'GET' });
}

export async function add(body: Record<string, any>) {
    return request<API.Result>(`/api/v1/app/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: body
    });
}

export async function update(body: Record<string, any>) {
    return request<API.Result>(`/api/v1/app/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: body
    });
}

export async function del(app_id: number) {
    return request<API.Result>(
        `/api/v1/app/del/${app_id}`,
        { method: 'DELETE' }
    );
}

export async function deploy(body: Record<string, any>) {
    return request<API.Result>(`/api/v1/app/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: body
    });
}

export async function cluster_list(name: string, page_size: number, page: number) {
    const params: Record<string, any> = {};
    params.page_size = page_size
    params.page = page
    if (name && name.trim()) {
        params.name = name.trim();
    }
    return request<API.Result>(`/api/v1/app/cluster`, { method: 'GET', params });
}

export async function get_cluster_by_id(cluster_id: number) {
    return request<API.Result>(`/api/v1/app/cluster/${cluster_id}`, { method: 'GET' });
}

export async function get_cluster_info(cluster_id: number) {
    return request<API.Result>(`/api/v1/app/clusterInfo/${cluster_id}`, { method: 'GET' });
}

export async function del_cluster(cluster_id: number) {
    return request<API.Result>(
        `/api/v1/app/cluster/${cluster_id}`,
        { method: 'DELETE' }
    );
}

export async function update_cluster(cluster_id: number, name: string) {
    return request<API.Result>(`/api/v1/app/cluster/${cluster_id}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        data: { "name": name }
    });
}
