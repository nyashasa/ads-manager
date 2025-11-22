import CampaignWizard from '@/components/campaign-wizard/wizard';

export default function NewCampaignPage() {
      return (
            <div className="container mx-auto py-8 px-4">
                  <h1 className="text-3xl font-bold mb-6">Create New Campaign</h1>
                  <CampaignWizard />
            </div>
      );
}
