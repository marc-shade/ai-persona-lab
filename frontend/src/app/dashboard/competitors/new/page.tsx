'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { competitorsApi } from '@/lib/api'
import { CompetitorFormData } from '@/types/competitor'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Plus, Trash2, Globe, Loader2 } from 'lucide-react'

const steps = [
  { id: 1, title: 'Your Product', description: 'Define your product' },
  { id: 2, title: 'Competitors', description: 'Add competitor info' },
  { id: 3, title: 'Review & Run', description: 'Finalize and analyze' },
]

export default function NewCompetitorAnalysisPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Product fields
  const [productName, setProductName] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productStrengths, setProductStrengths] = useState<string[]>([])
  const [productWeaknesses, setProductWeaknesses] = useState<string[]>([])
  const [strengthInput, setStrengthInput] = useState('')
  const [weaknessInput, setWeaknessInput] = useState('')
  const [scrapingProduct, setScrapingProduct] = useState(false)

  // Competitors
  const [competitors, setCompetitors] = useState<CompetitorFormData[]>([
    { name: '', url: '', description: '', features: [] },
  ])
  const [featureInputs, setFeatureInputs] = useState<string[]>([''])
  const [scrapingIdx, setScrapingIdx] = useState<number | null>(null)

  function addTag(list: string[], setList: (v: string[]) => void, value: string, setInput: (v: string) => void) {
    if (value.trim()) {
      setList([...list, value.trim()])
      setInput('')
    }
  }

  function removeTag(list: string[], setList: (v: string[]) => void, index: number) {
    setList(list.filter((_, i) => i !== index))
  }

  function updateCompetitor(index: number, field: keyof CompetitorFormData, value: any) {
    setCompetitors((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  function addCompetitor() {
    setCompetitors([...competitors, { name: '', url: '', description: '', features: [] }])
    setFeatureInputs([...featureInputs, ''])
  }

  function removeCompetitor(index: number) {
    if (competitors.length <= 1) return
    setCompetitors(competitors.filter((_, i) => i !== index))
    setFeatureInputs(featureInputs.filter((_, i) => i !== index))
  }

  async function scrapeProduct() {
    if (!productUrl) return
    setScrapingProduct(true)
    try {
      const data = await competitorsApi.scrapeUrl(productUrl)
      if (data.title && !productName) setProductName(data.title)
      if (data.description && !productDescription) setProductDescription(data.description)
    } catch (err) {
      console.error('Product scrape failed:', err)
    } finally {
      setScrapingProduct(false)
    }
  }

  async function scrapeCompetitorUrl(index: number) {
    const url = competitors[index].url
    if (!url) return
    setScrapingIdx(index)
    try {
      const data = await competitorsApi.scrapeUrl(url)
      if (data.title && !competitors[index].name) updateCompetitor(index, 'name', data.title)
      if (data.description && !competitors[index].description) updateCompetitor(index, 'description', data.description)
      if (data.features?.length) updateCompetitor(index, 'features', data.features.slice(0, 10))
    } catch (err) {
      console.error('Competitor scrape failed:', err)
    } finally {
      setScrapingIdx(null)
    }
  }

  function addFeature(index: number) {
    const val = featureInputs[index]?.trim()
    if (!val) return
    updateCompetitor(index, 'features', [...competitors[index].features, val])
    setFeatureInputs((prev) => prev.map((v, i) => i === index ? '' : v))
  }

  async function handleSave(runAnalysis: boolean) {
    setSaving(true)
    try {
      const payload = {
        name: `${productName} Analysis`,
        productName,
        productUrl: productUrl || undefined,
        productCategory: productCategory || undefined,
        productDescription: productDescription || undefined,
        productStrengths,
        productWeaknesses,
        competitors: competitors.filter((c) => c.name).map((c) => ({
          name: c.name,
          url: c.url || undefined,
          description: c.description || undefined,
          features: c.features,
        })),
      }

      const created = await competitorsApi.create(payload)

      if (runAnalysis) {
        // Scrape then analyze
        await competitorsApi.scrape(created.id)
        await competitorsApi.analyze(created.id)
      }

      router.push(`/dashboard/competitors/${created.id}`)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">New Competitor Analysis</h1>
          <p className="text-gray-600">Define your product and competitors for AI-powered analysis</p>

          <div className="flex items-center mt-6 space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep > step.id ? 'bg-green-500 text-white'
                    : currentStep === step.id ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step {currentStep}: {steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Your Product */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input
                    id="productName"
                    placeholder="e.g., PersonaLab Pro"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productUrl">Product URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="productUrl"
                      placeholder="https://yourproduct.com"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                    />
                    <Button variant="outline" onClick={scrapeProduct} disabled={!productUrl || scrapingProduct}>
                      {scrapingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productCategory">Category</Label>
                  <Input
                    id="productCategory"
                    placeholder="e.g., AI/ML, SaaS, Marketing"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Description</Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Describe your product..."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a strength"
                      value={strengthInput}
                      onChange={(e) => setStrengthInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          addTag(productStrengths, setProductStrengths, strengthInput, setStrengthInput)
                        }
                      }}
                    />
                    <Button variant="outline" onClick={() => addTag(productStrengths, setProductStrengths, strengthInput, setStrengthInput)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {productStrengths.map((s, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer">
                        {s}
                        <button onClick={() => removeTag(productStrengths, setProductStrengths, i)} className="ml-2 text-xs">&times;</button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Weaknesses</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a weakness"
                      value={weaknessInput}
                      onChange={(e) => setWeaknessInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          addTag(productWeaknesses, setProductWeaknesses, weaknessInput, setWeaknessInput)
                        }
                      }}
                    />
                    <Button variant="outline" onClick={() => addTag(productWeaknesses, setProductWeaknesses, weaknessInput, setWeaknessInput)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {productWeaknesses.map((w, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer">
                        {w}
                        <button onClick={() => removeTag(productWeaknesses, setProductWeaknesses, i)} className="ml-2 text-xs">&times;</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Competitors */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {competitors.map((comp, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Competitor {idx + 1}</h4>
                      {competitors.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeCompetitor(idx)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          placeholder="Competitor name"
                          value={comp.name}
                          onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://competitor.com"
                            value={comp.url}
                            onChange={(e) => updateCompetitor(idx, 'url', e.target.value)}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrapeCompetitorUrl(idx)}
                            disabled={!comp.url || scrapingIdx === idx}
                          >
                            {scrapingIdx === idx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description..."
                        value={comp.description}
                        onChange={(e) => updateCompetitor(idx, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Features</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a feature"
                          value={featureInputs[idx] || ''}
                          onChange={(e) => setFeatureInputs((prev) => prev.map((v, i) => i === idx ? e.target.value : v))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault()
                              addFeature(idx)
                            }
                          }}
                        />
                        <Button variant="outline" onClick={() => addFeature(idx)}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {comp.features.map((f, fi) => (
                          <Badge key={fi} variant="secondary" className="cursor-pointer">
                            {f.length > 60 ? f.slice(0, 60) + '...' : f}
                            <button onClick={() => updateCompetitor(idx, 'features', comp.features.filter((_, i) => i !== fi))} className="ml-2 text-xs">&times;</button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <Button variant="outline" onClick={addCompetitor} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </Button>
              </div>
            )}

            {/* Step 3: Review & Run */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg">Analysis Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Product:</strong> {productName}</div>
                    <div><strong>Category:</strong> {productCategory || 'Not specified'}</div>
                    <div><strong>URL:</strong> {productUrl || 'Not specified'}</div>
                    <div><strong>Competitors:</strong> {competitors.filter((c) => c.name).length}</div>
                  </div>

                  {productStrengths.length > 0 && (
                    <div>
                      <strong className="text-sm">Strengths:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {productStrengths.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                      </div>
                    </div>
                  )}

                  {productWeaknesses.length > 0 && (
                    <div>
                      <strong className="text-sm">Weaknesses:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {productWeaknesses.map((w, i) => <Badge key={i} variant="outline" className="text-xs">{w}</Badge>)}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <strong className="text-sm">Competitors:</strong>
                    <div className="space-y-2 mt-2">
                      {competitors.filter((c) => c.name).map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">{i + 1}</span>
                          <span className="font-medium">{c.name}</span>
                          {c.url && <span className="text-gray-400 truncate max-w-[200px]">{c.url}</span>}
                          <span className="text-gray-400">{c.features.length} features</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 1}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Previous
              </Button>

              {currentStep < 3 ? (
                <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={currentStep === 1 && !productName}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Draft
                  </Button>
                  <Button onClick={() => handleSave(true)} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save &amp; Analyze
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
