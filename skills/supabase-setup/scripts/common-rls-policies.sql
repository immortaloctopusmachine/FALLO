-- Common RLS Policy Templates
-- Copy and modify these for your specific tables

-- ===========================================
-- PATTERN 1: User-Owned Resources
-- Use for: posts, notes, documents, etc.
-- ===========================================

-- Enable RLS (run once per table)
-- ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Read own data
CREATE POLICY "Users can read own resources"
ON your_table FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create own data
CREATE POLICY "Users can create own resources"
ON your_table FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update own data
CREATE POLICY "Users can update own resources"
ON your_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete own data
CREATE POLICY "Users can delete own resources"
ON your_table FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ===========================================
-- PATTERN 2: Public Read, Private Write
-- Use for: blog posts, products, public profiles
-- ===========================================

-- Anyone can read
CREATE POLICY "Public read access"
ON your_table FOR SELECT
USING (true);

-- Only owners can write
CREATE POLICY "Owners can insert"
ON your_table FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update"
ON your_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete"
ON your_table FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ===========================================
-- PATTERN 3: Team/Organization Access
-- Use for: team projects, shared workspaces
-- ===========================================

-- First create a helper function
CREATE OR REPLACE FUNCTION get_user_team_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Team members can read
CREATE POLICY "Team members can read"
ON your_table FOR SELECT
TO authenticated
USING (team_id = ANY(get_user_team_ids()));

-- Team members can create
CREATE POLICY "Team members can create"
ON your_table FOR INSERT
TO authenticated
WITH CHECK (team_id = ANY(get_user_team_ids()));

-- Only owners can update/delete
CREATE POLICY "Owners can update"
ON your_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND team_id = ANY(get_user_team_ids()))
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete"
ON your_table FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- ===========================================
-- PATTERN 4: Role-Based Access
-- Use for: admin panels, moderation
-- ===========================================

-- Helper function to check role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Admin has full access
CREATE POLICY "Admin full access"
ON your_table FOR ALL
TO authenticated
USING (get_user_role() = 'admin')
WITH CHECK (get_user_role() = 'admin');

-- Regular users limited to own data
CREATE POLICY "Users access own data"
ON your_table FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR get_user_role() = 'admin');


-- ===========================================
-- PATTERN 5: Status-Based Visibility
-- Use for: content with draft/published states
-- ===========================================

-- View published or own content
CREATE POLICY "View published or own"
ON your_table FOR SELECT
USING (
  status = 'published'
  OR auth.uid() = user_id
);

-- Can only insert as draft
CREATE POLICY "Insert as draft only"
ON your_table FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'draft'
);

-- Can update own content
CREATE POLICY "Update own content"
ON your_table FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- ===========================================
-- UTILITY: Debug RLS
-- ===========================================

-- Check current user
-- SELECT auth.uid(), auth.role();

-- List policies on a table
-- SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check if RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'your_table';
