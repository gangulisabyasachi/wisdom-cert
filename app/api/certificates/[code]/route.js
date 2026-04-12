import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const certificate = await Certificate.findOne({ certificate_code: code });

    if (!certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: certificate });
  } catch (error) {
    console.error('Error fetching certificate by code:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const certificate = await Certificate.findOneAndDelete({ certificate_code: code });

    if (!certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const resolvedParams = await params;
    const { code } = resolvedParams;
    const body = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    // Exclude certificate_code from update to prevent identifier changes
    const { certificate_code, _id, ...updateData } = body;

    const certificate = await Certificate.findOneAndUpdate(
      { certificate_code: code },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: certificate });
  } catch (error) {
    console.error('Error updating certificate:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}
