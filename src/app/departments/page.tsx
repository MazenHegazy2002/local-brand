import { redirect } from 'next/navigation';

// "Departments" was the old name. Everything is now under "Categories"; this
// route exists only to keep old links working.
export default function DepartmentsRedirect() {
  redirect('/categories');
}
