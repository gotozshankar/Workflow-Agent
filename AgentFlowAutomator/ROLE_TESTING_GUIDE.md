# 🔐 User Login & Role Testing Guide

## How Different Roles Work

### **Role Hierarchy:**

```
Super Admin (100%) → Full access to everything
   ↓
Admin (70%) → Access to most features, cannot manage users
   ↓
User (20%) → View-only access
```

---

## **Testing Different Roles Step-by-Step:**

### **Step 1: Register First User (Auto-becomes Super Admin)**

1. Go to [http://localhost:5173/register](http://localhost:5173/register)
2. Fill in:
   - **Name:** `Admin User`
   - **Email:** `admin@agent.dev`
   - **Password:** `Admin123!`
3. Click **Register**
4. ✅ This user is automatically **Super Admin** (100%)

---

### **Step 2: Register Second User (Auto-becomes User)**

1. Click **Logout** (top-right dropdown)
2. Go to [http://localhost:5173/register](http://localhost:5173/register)
3. Fill in:
   - **Name:** `Regular User`
   - **Email:** `user@agent.dev`
   - **Password:** `User123!`
4. Click **Register**
5. ✅ This user is automatically **User** (20%)

---

### **Step 3: Change User Role to Admin**

1. **Login as Super Admin:**
   - Email: `admin@agent.dev`
   - Password: `Admin123!`

2. Click **Manage Users** in the user profile dropdown (top-right)

3. Find the **Regular User** row

4. Click the **Role dropdown** and select **Admin**

5. ✅ Now that user has **Admin** (70%) permissions

---

## **What Each Role Can Access:**

### **Super Admin (100%)**

- ✅ Workflows (view, create, edit, delete, execute)
- ✅ Agents (full access)
- ✅ Tools, Knowledge Base, Models (full access)
- ✅ **Security & Audit Logs** (admin-only)
- ✅ **Settings** (admin-only)
- ✅ **Manage Users** (admin-only) → Change roles, delete users
- ✅ Dropdown: Settings + Manage Users

### **Admin (70%)**

- ✅ Workflows (view, create, edit, execute)
- ❌ Workflows (cannot delete)
- ✅ Agents (create, edit)
- ❌ Agents (cannot delete)
- ✅ Tools, Knowledge Base, Models (create, edit)
- ✅ Security & Audit Logs
- ✅ Settings
- ❌ Manage Users (no access)
- ✅ Dropdown: Settings only

### **User (20%)**

- ✅ View Workflows, Agents, Tools, Models
- ❌ Create, edit, delete anything
- ❌ Security & Audit Logs
- ❌ Settings
- ❌ Manage Users
- ✅ Dropdown: Logout only

---

## **Testing Permissions**

### **As Super Admin:**

- Sidebar shows all 3 sections:
   - ✅ Workspace items
   - ✅ Models section
   - ✅ **Compliance** (Security + Audit Logs)
   - ✅ **Configuration** (Settings + Users)
- Dropdown shows: Settings + **Manage Users** + Logout

### **As Admin:**

- Sidebar shows:
   - ✅ Workspace items
   - ✅ Models section
   - ✅ **Compliance** (Security + Audit Logs)
   - ✅ **Configuration** (Settings only)
- Dropdown shows: Settings + Logout
- ❌ No "Manage Users" option

### **As User:**

- Sidebar shows only:
   - ✅ Workspace items
   - ✅ Models section
   - ❌ NO Compliance section
   - ❌ NO Configuration section
- Dropdown shows: Logout only

---

## **API Endpoints Used** (Backend Validation)

```
POST /api/auth/register     → First user = super_admin, rest = user
POST /api/auth/login        → Get JWT token with role
GET  /api/auth/me           → Get current user info
GET  /api/users             → List all users (admin+ only)
PATCH /api/users/<id>/role  → Change role (super_admin only)
DELETE /api/users/<id>      → Delete user (super_admin only)
```

---

## **Quick Test Checklist:**

- [ ] Register Super Admin (admin@agent.dev)
- [ ] Register User (user@agent.dev)
- [ ] Login as Super Admin
- [ ] See "Manage Users" in dropdown
- [ ] Change User role to Admin
- [ ] Logout and login as Admin
- [ ] Verify Admin cannot see "Manage Users"
- [ ] Verify Admin CAN see Security & Audit
- [ ] Logout and login as User
- [ ] Verify User sees minimal UI
- [ ] Verify User cannot change own role

---

🎉 **Role-based access control is now fully implemented!**
