import { redirect } from 'next/navigation';

export default function SettingsPage() {
  // Redirect to skills as default settings page
  redirect('/settings/skills');
}
