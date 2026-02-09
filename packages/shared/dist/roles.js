"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "STUDENT";
    UserRole["PARENT"] = "PARENT";
    UserRole["TEACHER"] = "TEACHER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["SUPERADMIN"] = "SUPERADMIN";
    UserRole["SUPPORT_AGENT"] = "SUPPORT_AGENT";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.ROLES = Object.values(UserRole);
