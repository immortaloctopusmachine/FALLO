# Row Level Security (RLS) Patterns

## Fundamentals

### Enable RLS

```sql
-- Always enable RLS on tables with user data
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (recommended)
ALTER TABLE posts FORCE ROW LEVEL SECURITY;
```

### Policy Anatomy

```sql
CREATE POLICY "policy_name"
ON table_name
FOR operation -- SELECT, INSERT, UPDATE, DELETE, ALL
TO role -- authenticated, anon, or specific role
USING (condition) -- For SELECT, UPDATE (existing rows), DELETE
WITH CHECK (condition); -- For INSERT, UPDATE (new values)
```

## Common Patterns

### 1. User Owns Row

Most common pattern - users can only access their own data.

```sql
-- Users can only see their own posts
CREATE POLICY "Users can view own posts"
ON posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert posts as themselves
CREATE POLICY "Users can insert own posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Public Read, Private Write

Content anyone can read but only owners can modify.

```sql
-- Anyone can read (including anonymous)
CREATE POLICY "Public read access"
ON posts FOR SELECT
USING (true);

-- Only authenticated owners can insert
CREATE POLICY "Authenticated insert"
ON posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only owners can update
CREATE POLICY "Owner update"
ON posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only owners can delete
CREATE POLICY "Owner delete"
ON posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### 3. Team/Organization Access

Users can access data belonging to their team.

```sql
-- Users can see posts from teams they belong to
CREATE POLICY "Team members can view posts"
ON posts FOR SELECT
TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- Team members can create posts for their team
CREATE POLICY "Team members can create posts"
ON posts FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
  )
);
```

### 4. Role-Based Access

Different permissions based on user role.

```sql
-- Assume users table has a 'role' column
-- And there's a function to get current user's role

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Admins can do everything
CREATE POLICY "Admin full access"
ON posts FOR ALL
TO authenticated
USING (get_user_role() = 'admin');

-- Regular users can only access their own
CREATE POLICY "Users access own posts"
ON posts FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  OR get_user_role() = 'admin'
)
WITH CHECK (
  auth.uid() = user_id
  OR get_user_role() = 'admin'
);
```

### 5. Status-Based Visibility

Published content visible to all, drafts only to owner.

```sql
CREATE POLICY "View published or own posts"
ON posts FOR SELECT
USING (
  status = 'published'
  OR auth.uid() = user_id
);

-- Can only insert as draft
CREATE POLICY "Insert as draft"
ON posts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'draft'
);
```

### 6. Time-Based Access

Access based on time constraints.

```sql
-- Events visible only before they expire
CREATE POLICY "View active events"
ON events FOR SELECT
USING (
  expires_at > NOW()
  OR auth.uid() = organizer_id
);
```

### 7. Hierarchical Access (Parent-Child)

Access child records based on parent ownership.

```sql
-- Users can see comments on their posts
CREATE POLICY "View comments on own posts"
ON comments FOR SELECT
TO authenticated
USING (
  post_id IN (
    SELECT id FROM posts WHERE user_id = auth.uid()
  )
  OR auth.uid() = user_id -- Or commenter themselves
);

-- Anyone can comment on public posts
CREATE POLICY "Comment on public posts"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  post_id IN (
    SELECT id FROM posts WHERE status = 'published'
  )
  AND auth.uid() = user_id
);
```

### 8. Invitation-Based Access

Access granted through invitations table.

```sql
-- Schema
CREATE TABLE project_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  email TEXT NOT NULL,
  accepted_at TIMESTAMP
);

-- Users can access projects they're invited to
CREATE POLICY "Invited users can view project"
ON projects FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR id IN (
    SELECT project_id FROM project_invites
    WHERE email = auth.jwt()->>'email'
    AND accepted_at IS NOT NULL
  )
);
```

## Helper Functions

### Get Current User's Email

```sql
-- Email from JWT
CREATE OR REPLACE FUNCTION auth.email()
RETURNS TEXT AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'email',
    (current_setting('request.jwt.claims', true)::json->>'sub')
  );
$$ LANGUAGE sql STABLE;
```

### Check User Membership

```sql
CREATE OR REPLACE FUNCTION is_team_member(team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = $1
    AND team_members.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Usage in policy
CREATE POLICY "Team access"
ON documents FOR SELECT
USING (is_team_member(team_id));
```

### Check Admin Status

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Usage
CREATE POLICY "Admin only"
ON sensitive_data FOR ALL
USING (is_admin());
```

## Performance Optimization

### Index Policy Columns

```sql
-- If policy uses user_id frequently
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- If policy uses team lookups
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
```

### Avoid Subqueries in Hot Paths

```sql
-- Slow: Subquery executed for each row
CREATE POLICY "slow_policy"
ON posts FOR SELECT
USING (
  team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
);

-- Faster: Use a function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "faster_policy"
ON posts FOR SELECT
USING (team_id = ANY(get_user_team_ids()));
```

## Debugging RLS

### Check Current User

```sql
SELECT auth.uid(), auth.role();
```

### Test Policy as User

```sql
-- In Supabase SQL editor
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Now test queries
SELECT * FROM posts;
```

### List All Policies

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'your_table';
```

### Check If RLS Is Enabled

```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname = 'your_table';
```

## Common Mistakes

### 1. Forgetting WITH CHECK

```sql
-- Wrong: Users could update to change ownership
CREATE POLICY "bad_update"
ON posts FOR UPDATE
USING (auth.uid() = user_id);

-- Correct: WITH CHECK prevents ownership change
CREATE POLICY "good_update"
ON posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Missing Policy for Operation

```sql
-- User can read but not insert (no INSERT policy)
CREATE POLICY "read_only"
ON posts FOR SELECT
USING (auth.uid() = user_id);

-- Add INSERT policy too
CREATE POLICY "insert_own"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 3. Service Role Bypasses RLS

Service role key ignores all policies - only use server-side for admin operations.

### 4. Expensive Subqueries

Avoid complex subqueries in frequently-accessed tables. Use functions or denormalization instead.
