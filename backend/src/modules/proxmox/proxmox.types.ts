export type ProxmoxResource = {
    id: string;
    type: string;
    status?: string;
    node?: string;
    vmid?: number;
    name?: string;
    cpu?: number;
    maxcpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
};

export type ProxmoxMetricPoint = {
    time: number;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
};
