# Permissions, Roles, and Skills

This document outlines user permissions, company roles, and skills in Fallo.

---

## User Permissions

Permissions determine access levels within the application. Stored as `UserPermission` enum in the database.

| Permission | Value | Access |
|------------|-------|--------|
| **Viewer** | `VIEWER` | Read-only access to boards and cards |
| **Member** | `MEMBER` | Can create and edit cards |
| **Admin** | `ADMIN` | Can manage boards, lists, and users |
| **Super Admin** | `SUPER_ADMIN` | Full system access, can create/delete users |

> **Note:** Previously called "Roles" — renamed to "Permissions" in Feb 2026 to distinguish from Company Roles.

---

## Company Roles

Company roles represent job functions within the organization. Users can have multiple roles. These are managed in **Settings > Roles**.

### Default Roles

| Role | Color | Hex | Description |
|------|-------|-----|-------------|
| **PO** | Purple | `#8b5cf6` | Product Owner |
| **Lead** | Blue | `#3b82f6` | Team Lead |
| **Artist** | Pink | `#ec4899` | Visual Artist |
| **Animator** | Orange | `#f97316` | Spine / 2D Animator |
| **QA** | Teal | `#14b8a6` | Quality Assurance |
| **Math** | Indigo | `#6366f1` | Game Mathematics |
| **Sound** | Red | `#ef4444` | Sound Designer |

### Custom Roles

Administrators can create additional company roles via Settings > Roles with custom names, descriptions, and colors.

---

## Skills

Skills represent technical competencies that can be assigned to users. These are used to match team members to appropriate work blocks. Managed in **Settings > Skills**.

### Default Skills

| Skill | Description |
|-------|-------------|
| Math/Mechanics | Game mathematics and mechanics design |
| Spine Animation | Spine 2D animation creation |
| Concept Art | Initial visual concepts and ideation |
| Production Art | Final production-ready artwork |
| QA Testing | Quality assurance and testing |
| Sound Design | Sound effects and audio design |
| Music Composition | Original music and composition |
| Project Management | Project coordination and management |
| Marketing | Marketing materials and campaigns |
| Development | Software development and integration |

### Custom Skills

Administrators can create custom skills via Settings > Skills to match specific team competencies.

---

## Dedication Levels

When assigning users to blocks or events, dedication levels indicate time allocation:

| Level | Percentage | Description |
|-------|------------|-------------|
| **Light** | 25% | Advisory role |
| **Partial** | 50% | Split between projects |
| **Primary** | 75% | Main focus |
| **Full** | 100% | Exclusively dedicated |

---

## Terminology Reference

| Term | Meaning | DB Model |
|------|---------|----------|
| Permission | Access level (Viewer/Member/Admin/Super Admin) | `UserPermission` enum on `User.permission` |
| Company Role | Job function (PO, Lead, Artist, etc.) | `CompanyRole` model, assigned via `UserCompanyRole` |
| Skill | Technical competency (Spine, Concept Art, etc.) | `Skill` model, assigned via `UserSkill` |

---

## Related Block Types

Skills often correspond to specific block types in the timeline:

| Block Type | Related Skills |
|------------|---------------|
| Math Mechanics | Math/Mechanics |
| Spine Prototype | Spine Animation |
| Concept | Concept Art |
| Production | Production Art |
| QA | QA Testing |
| Marketing | Marketing |
| Custom | Any |

---

## Related Event Types

| Event Type | Description |
|------------|-------------|
| GSD | Game Specification Document milestone |
| Marketing Deadline | Marketing material due date |
| Review | Review meeting or checkpoint |
| Demo | Demo presentation |
| Send To | Delivery to external party |
| Vacation | Team member vacation |
| Greenlight | Project approval milestone |
| Music Start | Music production begins |
| SFX Start | Sound effects production begins |
| Game Name | Game naming finalized |
| Release | Game release milestone |
| Server | Server-side deployment |
| Client | Client-side deployment |
| Custom | Custom event type |
