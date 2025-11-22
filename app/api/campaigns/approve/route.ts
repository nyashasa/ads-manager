import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
      try {
            const body = await request.json();
            const { campaignId, action, notes } = body;

            if (!campaignId || !action) {
                  return NextResponse.json(
                        { error: 'Missing campaignId or action' },
                        { status: 400 }
                  );
            }

            if (!['approve', 'reject'].includes(action)) {
                  return NextResponse.json(
                        { error: 'Invalid action. Must be "approve" or "reject"' },
                        { status: 400 }
                  );
            }

            const newStatus = action === 'approve' ? 'approved' : 'rejected';

            // Get current campaign to preserve existing notes
            const { data: currentCampaign } = await supabase
                  .from('campaigns')
                  .select('notes')
                  .eq('id', campaignId)
                  .single();

            // Update campaign status
            const { data: campaign, error: campaignError } = await supabase
                  .from('campaigns')
                  .update({
                        status: newStatus,
                        notes: notes
                              ? `${currentCampaign?.notes || ''}\n\n[Admin ${action === 'approve' ? 'Approved' : 'Rejected'}] ${new Date().toISOString()}: ${notes}`.trim()
                              : currentCampaign?.notes,
                        updated_at: new Date().toISOString(),
                  })
                  .eq('id', campaignId)
                  .select()
                  .single();

            if (campaignError) {
                  console.error('Error updating campaign:', campaignError);
                  return NextResponse.json(
                        { error: 'Failed to update campaign' },
                        { status: 500 }
                  );
            }

            // If approved, also update flight status
            if (action === 'approve') {
                  const { error: flightError } = await supabase
                        .from('flights')
                        .update({ status: 'approved' })
                        .eq('campaign_id', campaignId);

                  if (flightError) {
                        console.error('Error updating flights:', flightError);
                        // Don't fail the request, but log the error
                  }
            }

            return NextResponse.json(
                  { message: `Campaign ${action === 'approve' ? 'approved' : 'rejected'} successfully`, campaign },
                  { status: 200 }
            );
      } catch (error) {
            console.error('Unhandled campaign approval error:', error);
            return NextResponse.json(
                  { error: 'An unexpected error occurred' },
                  { status: 500 }
            );
      }
}

