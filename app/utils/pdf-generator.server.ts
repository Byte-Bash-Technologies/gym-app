import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { supabase } from './supabase.client';

export async function generateMembershipPDF(memberId: number) {
  const doc = new PDFDocument();
  const stream = new PassThrough();

  // Fetch member data from your database here
  const memberData = await fetchMemberData(memberId);

  doc.pipe(stream);

  // Add content to the PDF
  doc.fontSize(25).text('Membership Details', 100, 80);
  doc.fontSize(15).text(`Name: ${memberData.full_name}`, 100, 120);
  doc.text(`Admission No: ${memberData.admission_no}`, 100, 140);
  // Add more details as needed

  doc.end();

  // Convert the stream to a ReadableStream
  const readableStream = createReadableStreamFromReadable(stream);

  // Upload the PDF to Supabase storage
  const { data, error } = await supabase.storage
    .from('membership-pdfs')
    .upload(`${memberId}.pdf`, readableStream, {
      contentType: 'application/pdf',
    });

  if (error) {
    throw new Error('Failed to upload PDF');
  }

  // Get the public URL of the uploaded PDF
  const { publicURL, error: urlError } = supabase.storage
    .from('membership-pdfs')
    .getPublicUrl(`${memberId}.pdf`);

  if (urlError) {
    throw new Error('Failed to get PDF URL');
  }

  return publicURL;
}

async function fetchMemberData(memberId: number) {
  // Implement this function to fetch member data from your database
  // Return an object with member details
}