/**
 * Permission codes of the role-permission matrix (documentation.wiki) that the interface uses to decide what to show.
 * Screens, menu items and buttons depend on these codes from the token and never on the name of a role, because the
 * administrator can create roles and change their permissions. The Gateway sends them to every microservice in
 * `X-User-Permission` and each microservice verifies them again against the `x-permiso` of its contract.
 * The permissions of MS01 live in modules/ms01-identity/utils/permissions.ts.
 */
export const PERMISSION = {
  MS02_CAMPUS_READ: 'ms02:campus:read',
  MS02_ROUTE_READ: 'ms02:route:read',
  MS02_PREVENTIVE_INFO_READ: 'ms02:preventive_info:read',
  MS02_BUILDING_WRITE: 'ms02:building:write',
  MS02_SPACE_WRITE: 'ms02:space:write',
  MS02_SAFE_ZONE_WRITE: 'ms02:safe_zone:write',
  MS02_ROUTE_WRITE: 'ms02:route:write',
  MS02_ROUTE_STATUS_WRITE: 'ms02:route_status:write',
  MS02_QR_MANAGE: 'ms02:qr:manage',

  MS03_ALERT_RECEIVE: 'ms03:alert:receive',
  MS03_ALERT_MANAGE: 'ms03:alert:manage',
  MS03_ALERT_MANAGE_DRILL: 'ms03:alert:manage_drill',
  MS03_ALERT_READ_HISTORY: 'ms03:alert:read_history',

  MS04_CHECKIN_WRITE: 'ms04:checkin:write',
  MS04_CHECKIN_READ_OWN: 'ms04:checkin:read_own',
  MS04_ASSISTANCE_REQUEST: 'ms04:assistance:request',
  MS04_DASHBOARD_READ: 'ms04:dashboard:read',
  MS04_HISTORY_READ: 'ms04:history:read',

  MS05_BRIGADIER_ASSIGN_TO_DRILL: 'ms05:brigadier:assign_to_drill',
  MS05_BRIGADIER_ASSIGN_TO_REAL: 'ms05:brigadier:assign_to_real',
  MS05_PANEL_READ_OWN: 'ms05:panel:read_own',
  MS05_ASSISTANCE_READ: 'ms05:assistance:read',
  MS05_ASSISTANCE_REGISTER: 'ms05:assistance:register',
  MS05_ASSISTANCE_ASSIGN_TO_DRILL: 'ms05:assistance:assign_to_drill',
  MS05_ASSISTANCE_ASSIGN_TO_REAL: 'ms05:assistance:assign_to_real',
  MS05_ASSISTANCE_UPDATE_STATUS: 'ms05:assistance:update_status',
  MS05_INCIDENT_REPORT: 'ms05:incident:report',
  MS05_INCIDENT_MANAGE_OWN: 'ms05:incident:manage_own',
  MS05_INCIDENT_READ: 'ms05:incident:read',
  MS05_INCIDENT_UPDATE: 'ms05:incident:update',

  MS06_DRILL_MANAGE: 'ms06:drill:manage',
  MS06_DRILL_EXECUTE: 'ms06:drill:execute',
  MS06_DRILL_EVALUATE: 'ms06:drill:evaluate',
  MS06_DRILL_READ: 'ms06:drill:read',
  MS06_DRILL_COMPARE_REPORT: 'ms06:drill:compare_report',
  MS06_REAL_EVENT_MANAGE: 'ms06:real_event:manage',
  MS06_REAL_EVENT_EXECUTE: 'ms06:real_event:execute',
  MS06_REAL_EVENT_EVALUATE: 'ms06:real_event:evaluate',
  MS06_REAL_EVENT_READ: 'ms06:real_event:read',
  MS06_REAL_EVENT_COMPARE_REPORT: 'ms06:real_event:compare_report',

  MS07_CONTENT_READ: 'ms07:content:read',
  MS07_QUIZ_TAKE: 'ms07:quiz:take',
  MS07_TUTOR_USE: 'ms07:tutor:use',
  MS07_CONTENT_MANAGE: 'ms07:content:manage',

  MS08_AUDIT_DRILL_READ: 'ms08:audit_drill:read',
  MS08_AUDIT_REAL_EVENT_READ: 'ms08:audit_real_event:read',
  MS08_INDICATORS_DRILL_READ: 'ms08:indicators_drill:read',
  MS08_INDICATORS_REAL_EVENT_READ: 'ms08:indicators_real_event:read',
} as const;
