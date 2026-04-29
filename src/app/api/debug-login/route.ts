import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  
  if (password === 'DEBUG_BYPASS_KEY') {
    if (email === 'admin@localbrand.com') {
      return NextResponse.json({ 
        success: true, 
        user: { id: "debug-admin-id", name: "Admin", email: "admin@localbrand.com", role: "ADMIN" } 
      });
    }
    if (email === 'ali@localbrand.com') {
      return NextResponse.json({ 
        success: true, 
        user: { id: "2dc1447b-370a-4fee-aece-3a333cf2f04c", name: "Ali", email: "ali@localbrand.com", role: "SELLER" } 
      });
    }
    if (email === 'mazen@localbrand.com') {
      return NextResponse.json({ 
        success: true, 
        user: { id: "debug-mazen-id", name: "Mazen", email: "mazen@localbrand.com", role: "BUYER" } 
      });
    }
  }
  
  return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
}