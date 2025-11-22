import CampaignWizard from '@/components/campaign-wizard/wizard';

export default function NewCampaignPage() {
      return (
            <div className="container mx-auto py-6 sm:py-8 px-4">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Create New Campaign</h1>
                  <CampaignWizard />
            </div>
      );
}
