'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function Step4Creatives({ data, updateData }: any) {
      // Mock upload handler
      const handleUpload = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                  // In real app, upload to storage and get URL
                  updateData({
                        creativeAsset: file.name,
                        creativeUrl: URL.createObjectURL(file)
                  });
            }
      };

      return (
            <div className="space-y-6">
                  <div className="space-y-2">
                        <Label htmlFor="format">Ad Format</Label>
                        <Select
                              value={data.creativeFormat}
                              onValueChange={(val) => updateData({ creativeFormat: val })}
                        >
                              <SelectTrigger id="format">
                                    <SelectValue placeholder="Select Format" />
                              </SelectTrigger>
                              <SelectContent>
                                    <SelectItem value="portal_banner">Portal Banner (300x250)</SelectItem>
                                    <SelectItem value="full_screen">Full Screen Interstitial</SelectItem>
                                    <SelectItem value="survey">Survey</SelectItem>
                                    <SelectItem value="voucher">Voucher</SelectItem>
                              </SelectContent>
                        </Select>
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="headline">Headline</Label>
                        <Input
                              id="headline"
                              placeholder="e.g. Win Big with Summer Promo"
                              value={data.headline || ''}
                              onChange={(e) => updateData({ headline: e.target.value })}
                        />
                  </div>

                  <div className="space-y-2">
                        <Label htmlFor="cta">Call to Action URL</Label>
                        <Input
                              id="cta"
                              placeholder="https://example.com/promo"
                              value={data.ctaUrl || ''}
                              onChange={(e) => updateData({ ctaUrl: e.target.value })}
                        />
                  </div>

                  <div className="space-y-2">
                        <Label>Upload Creative Asset</Label>
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                              <Input
                                    type="file"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={handleUpload}
                              />
                              <Label htmlFor="file-upload" className="cursor-pointer block">
                                    {data.creativeAsset ? (
                                          <div className="space-y-2">
                                                <p className="text-green-600 font-medium">Uploaded: {data.creativeAsset}</p>
                                                {data.creativeUrl && (
                                                      <img src={data.creativeUrl} alt="Preview" className="mx-auto h-32 object-contain" />
                                                )}
                                                <Button variant="outline" size="sm">Change File</Button>
                                          </div>
                                    ) : (
                                          <div className="space-y-2">
                                                <p className="text-muted-foreground">Drag & drop or click to upload</p>
                                                <Button variant="secondary" size="sm">Select File</Button>
                                          </div>
                                    )}
                              </Label>
                        </div>
                  </div>
            </div>
      );
}
