'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Step1Objective from './step-1-objective';
import Step2Routes from './step-2-routes';
import Step3Schedule from './step-3-schedule';
import Step4Creatives from './step-4-creatives';
import Step5Review from './step-5-review';
import CampaignSummary from './campaign-summary';

export default function CampaignWizard() {
      const [step, setStep] = useState(1);
      const [formData, setFormData] = useState({
            objective: '',
            advertiserName: '',
            campaignName: '',
            routeIds: [] as string[],
            startDate: '',
            endDate: '',
            shareOfVoice: 50,
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            company: '',
            notes: '',
            // ... other fields
      });

      // Parse URL parameters from estimator
      useEffect(() => {
            const params = new URLSearchParams(window.location.search);
            const routes = params.get('routes');
            const startDate = params.get('startDate');
            const endDate = params.get('endDate');
            const shareOfVoice = params.get('shareOfVoice');

            if (routes || startDate || endDate || shareOfVoice) {
                  setFormData(prev => ({
                        ...prev,
                        routeIds: routes ? routes.split(',') : prev.routeIds,
                        startDate: startDate || prev.startDate,
                        endDate: endDate || prev.endDate,
                        shareOfVoice: shareOfVoice ? parseInt(shareOfVoice) : prev.shareOfVoice,
                  }));
                  // Always start at step 1, even when data is prefilled from estimator
            }
      }, []);

      const nextStep = () => setStep(step + 1);
      const prevStep = () => setStep(step - 1);

      const updateData = useCallback((data: any) => {
            setFormData((prev) => ({ ...prev, ...data }));
      }, []);

      return (
            <div>
                  <div className="mb-8">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(step / 5) * 100}%` }}
                              />
                        </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left Column: Main Content */}
                        <div className="lg:col-span-2">
                              <Card>
                                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                                          <CardTitle className="text-lg sm:text-xl">
                                                {step === 1 && 'Step 1: Objective & Advertiser'}
                                                {step === 2 && 'Step 2: Audience & Routes'}
                                                {step === 3 && 'Step 3: Schedule & Budget'}
                                                {step === 4 && 'Step 4: Creatives'}
                                                {step === 5 && 'Step 5: Review & Quote'}
                                          </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                          {step === 1 && <Step1Objective data={formData} updateData={updateData} />}
                                          {step === 2 && <Step2Routes data={formData} updateData={updateData} />}
                                          {step === 3 && <Step3Schedule data={formData} updateData={updateData} />}
                                          {step === 4 && <Step4Creatives data={formData} updateData={updateData} />}
                                          {step === 5 && <Step5Review data={formData} updateData={updateData} />}
                                    </CardContent>
                                    <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
                                          <Button variant="outline" onClick={prevStep} disabled={step === 1} className="w-full sm:w-auto">
                                                Back
                                          </Button>
                                          <Button onClick={nextStep} disabled={step === 5} className="w-full sm:w-auto">
                                                {step === 5 ? 'Submit' : 'Next'}
                                          </Button>
                                    </CardFooter>
                              </Card>
                        </div>

                        {/* Right Column: Campaign Summary Sidebar */}
                        <div className="lg:col-span-1">
                              <CampaignSummary data={formData} />
                        </div>
                  </div>
            </div>
      );
}
