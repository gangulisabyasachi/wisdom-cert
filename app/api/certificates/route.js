import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Certificate from '@/lib/models/Certificate';

export async function GET(request) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    
    // Build query
    let query = {};
    if (search) {
        query = {
            $or: [
                { recipient_name: { $regex: search, $options: 'i' } },
                { certificate_code: { $regex: search, $options: 'i' } },
                { book_title: { $regex: search, $options: 'i' } },
                { isbn: { $regex: search, $options: 'i' } },
                { issn: { $regex: search, $options: 'i' } }
            ]
        };
    }

    // Sort by issue_date descending
    const certificates = await Certificate.find(query).sort({ issue_date: -1 }).limit(100);
    return NextResponse.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Generate WJ code
    const uniqueId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const year = new Date().getFullYear();
    const certificate_code = `WJ${year}${uniqueId}`;

    const certData = {
        recipient_name: body.recipient_name,
        designation: body.designation || '',
        institution: body.institution || '',
        book_title: body.book_title || '',
        isbn: body.isbn || '',
        issn: body.issn || '',
        chapter_title: body.chapter_title || '',
        issue_date: body.issue_date ? new Date(body.issue_date) : new Date(),
        certificate_code
    };

    const certificate = await Certificate.create(certData);
    return NextResponse.json({ success: true, data: certificate });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json({ success: false, error: 'Failed to create certificate' }, { status: 500 });
  }
}
