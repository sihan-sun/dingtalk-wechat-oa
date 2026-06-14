/**
 * 平台员工统一数据格式 (DTO)
 * 钉钉和企业微信返回的员工数据都转换为此格式
 */
export interface PlatformStaffDTO {
  platformType: 'dingtalk' | 'wecom';
  corpId: string;
  platformUserId: string;
  platformUnionId?: string;
  name?: string;
  mobile?: string;
  email?: string;
  jobNumber?: string;
  avatar?: string;
  departmentIds?: string[];
  departmentNames?: string[];
  position?: string;
  status?: 'active' | 'inactive' | 'resigned' | 'deleted';
  joinTime?: Date;
  resignTime?: Date;
  rawData: Record<string, any>;
}
