/**
 * Permission codes of the role-permission matrix (documentation.wiki) that the interface uses to decide what to show.
 * Screens, menu items and buttons depend on these codes from the token and never on the name of a role, because the
 * administrator can create roles and change their permissions. The backend verifies every permission again.
 * The permissions of MS01 live in modules/ms01-identity/utils/permissions.ts.
 */
export const PERMISSION = {
  MS02_CAMPUS_READ: 'ms02:campus:read',
  MS02_ROUTE_READ: 'ms02:route:read',
  MS02_BUILDING_WRITE: 'ms02:building:write',
  MS02_SPACE_WRITE: 'ms02:space:write',
  MS02_SAFE_ZONE_WRITE: 'ms02:safe_zone:write',
  MS02_ROUTE_WRITE: 'ms02:route:write',
  MS02_ROUTE_STATUS_WRITE: 'ms02:route_status:write',

  MS03_ALERT_RECEIVE: 'ms03:alert:receive',
  MS03_ALERT_MANAGE: 'ms03:alert:manage',
  MS03_ALERT_MANAGE_DRILL: 'ms03:alert:manage_drill',
  MS03_ALERT_READ_HISTORY: 'ms03:alert:read_history',

  MS04_CHECKIN_WRITE: 'ms04:checkin:write',
  MS04_DASHBOARD_READ: 'ms04:dashboard:read',

  MS05_BRIGADIER_ASSIGN_TO_DRILL: 'ms05:brigadier:assign_to_drill',
  MS05_BRIGADIER_ASSIGN_TO_REAL: 'ms05:brigadier:assign_to_real',
  MS05_PANEL_READ_OWN: 'ms05:panel:read_own',
  MS05_ASSISTANCE_REGISTER: 'ms05:assistance:register',
  MS05_INCIDENT_REPORT: 'ms05:incident:report',

  MS06_DRILL_MANAGE: 'ms06:drill:manage',
  MS06_DRILL_EXECUTE: 'ms06:drill:execute',
  MS06_DRILL_READ: 'ms06:drill:read',
  MS06_REAL_EVENT_MANAGE: 'ms06:real_event:manage',
  MS06_REAL_EVENT_EXECUTE: 'ms06:real_event:execute',
  MS06_REAL_EVENT_READ: 'ms06:real_event:read',

  MS07_TUTOR_USE: 'ms07:tutor:use',

  MS08_INDICATORS_READ: 'ms08:indicators:read',
  MS08_AUDIT_READ: 'ms08:audit:read',
} as const;
