'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ICPFormData } from '@/types/icp'
import { ArrowLeft, ArrowRight, Check, ChevronRight } from 'lucide-react'
import { icpsApi } from '@/lib/api'

const steps = [
  { id: 1, title: 'Business Context', description: 'Industry, product, and goals' },
  { id: 2, title: 'Demographics', description: 'Age, location, income, education' },
  { id: 3, title: 'Psychographics', description: 'Values, interests, lifestyle' },
  { id: 4, title: 'Pain Points & Goals', description: 'Challenges and objectives' },
  { id: 5, title: 'Review & Save', description: 'Name and finalize your ICP' },
]

const industries = [
  'Technology', 'Healthcare', 'Finance', 'E-commerce', 'Manufacturing',
  'Education', 'Real Estate', 'Consulting', 'Non-profit', 'Other'
]

const businessModels = [
  'B2B SaaS', 'B2C E-commerce', 'Marketplace', 'Subscription', 'Freemium',
  'Enterprise Sales', 'Consulting Services', 'Agency', 'Product Sales', 'Other'
]

const educationLevels = [
  'High School', 'Some College', 'Bachelor\'s Degree', 'Master\'s Degree',
  'PhD', 'Professional Certification', 'Trade School'
]

export default function NewICPPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ICPFormData>({
    industry: '',
    productType: '',
    businessModel: '',
    goals: [],
    ageRange: [25, 55],
    location: [],
    incomeRange: [50000, 150000],
    education: '',
    occupation: '',
    values: [],
    interests: [],
    lifestyle: [],
    buyingBehaviors: [],
    painPoints: [],
    primaryGoals: [],
    secondaryGoals: [],
    name: '',
    description: '',
  })

  const [tempInputs, setTempInputs] = useState({
    goal: '',
    location: '',
    value: '',
    interest: '',
    lifestyle: '',
    behavior: '',
    painPoint: '',
    primaryGoal: '',
    secondaryGoal: '',
  })

  const addArrayItem = (field: keyof ICPFormData, value: string, inputField: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()]
      }))
      setTempInputs(prev => ({ ...prev, [inputField]: '' }))
    }
  }

  const removeArrayItem = (field: keyof ICPFormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }))
  }

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const payload: Record<string, unknown> = { ...formData }
      // Align field names for backend (locations vs location, incomeRange to min/max)
      payload['locations'] = formData.location
      const created = await icpsApi.create(payload)
      console.log('ICP created:', created)
      router.push('/dashboard/icps')
    } catch (err) {
      console.error('Failed to create ICP', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to ICPs
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New ICP</h1>
          <p className="text-gray-600">
            Follow the 5-step process to define your ideal customer profile
          </p>

          {/* Progress steps */}
          <div className="flex items-center mt-6 space-x-4 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle>
              Step {currentStep}: {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Business Context */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    >
                      <option value="">Select industry</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessModel">Business Model</Label>
                    <select
                      id="businessModel"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.businessModel}
                      onChange={(e) => setFormData({ ...formData, businessModel: e.target.value })}
                    >
                      <option value="">Select business model</option>
                      {businessModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productType">Product/Service Type</Label>
                  <Input
                    id="productType"
                    placeholder="e.g., Project management software, Marketing automation platform"
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Goals</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a business goal"
                      value={tempInputs.goal}
                      onChange={(e) => setTempInputs({ ...tempInputs, goal: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          addArrayItem('goals', tempInputs.goal, 'goal')
                        }
                      }}
                    />
                    <Button
                      onClick={() => addArrayItem('goals', tempInputs.goal, 'goal')}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.goals.map((goal, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {goal}
                        <button
                          onClick={() => removeArrayItem('goals', index)}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Demographics */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age Range</Label>
                    <div className="flex items-center space-x-4">
                      <Input
                        type="number"
                        placeholder="Min age"
                        value={formData.ageRange[0]}
                        onChange={(e) => setFormData({
                          ...formData,
                          ageRange: [parseInt(e.target.value) || 0, formData.ageRange[1]]
                        })}
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        placeholder="Max age"
                        value={formData.ageRange[1]}
                        onChange={(e) => setFormData({
                          ...formData,
                          ageRange: [formData.ageRange[0], parseInt(e.target.value) || 0]
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education">Education Level</Label>
                    <select
                      id="education"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    >
                      <option value="">Select education level</option>
                      {educationLevels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation/Job Title</Label>
                  <Input
                    id="occupation"
                    placeholder="e.g., Marketing Manager, CTO, Business Owner"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Income Range (USD)</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      type="number"
                      placeholder="Min income"
                      value={formData.incomeRange[0]}
                      onChange={(e) => setFormData({
                        ...formData,
                        incomeRange: [parseInt(e.target.value) || 0, formData.incomeRange[1]]
                      })}
                    />
                    <span>to</span>
                    <Input
                      type="number"
                      placeholder="Max income"
                      value={formData.incomeRange[1]}
                      onChange={(e) => setFormData({
                        ...formData,
                        incomeRange: [formData.incomeRange[0], parseInt(e.target.value) || 0]
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Geographic Locations</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a location (e.g., United States, Europe, Remote)"
                      value={tempInputs.location}
                      onChange={(e) => setTempInputs({ ...tempInputs, location: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                          e.preventDefault()
                          addArrayItem('location', tempInputs.location, 'location')
                        }
                      }}
                    />
                    <Button
                      onClick={() => addArrayItem('location', tempInputs.location, 'location')}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.location.map((loc, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        {loc}
                        <button
                          onClick={() => removeArrayItem('location', index)}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Psychographics */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Core Values</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a core value (e.g., Innovation, Security, Efficiency)"
                        value={tempInputs.value}
                        onChange={(e) => setTempInputs({ ...tempInputs, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('values', tempInputs.value, 'value')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('values', tempInputs.value, 'value')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.values.map((value, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {value}
                          <button
                            onClick={() => removeArrayItem('values', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Interests & Hobbies</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an interest (e.g., Technology, Reading, Traveling)"
                        value={tempInputs.interest}
                        onChange={(e) => setTempInputs({ ...tempInputs, interest: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('interests', tempInputs.interest, 'interest')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('interests', tempInputs.interest, 'interest')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.interests.map((interest, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {interest}
                          <button
                            onClick={() => removeArrayItem('interests', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Lifestyle Traits</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a lifestyle trait (e.g., Remote work, Work-life balance)"
                        value={tempInputs.lifestyle}
                        onChange={(e) => setTempInputs({ ...tempInputs, lifestyle: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('lifestyle', tempInputs.lifestyle, 'lifestyle')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('lifestyle', tempInputs.lifestyle, 'lifestyle')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.lifestyle.map((trait, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {trait}
                          <button
                            onClick={() => removeArrayItem('lifestyle', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Buying Behaviors</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a buying behavior (e.g., Research-heavy, Price-sensitive)"
                        value={tempInputs.behavior}
                        onChange={(e) => setTempInputs({ ...tempInputs, behavior: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('buyingBehaviors', tempInputs.behavior, 'behavior')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('buyingBehaviors', tempInputs.behavior, 'behavior')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.buyingBehaviors.map((behavior, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {behavior}
                          <button
                            onClick={() => removeArrayItem('buyingBehaviors', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pain Points & Goals */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pain Points & Challenges</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a pain point (e.g., Lack of automation, High costs)"
                        value={tempInputs.painPoint}
                        onChange={(e) => setTempInputs({ ...tempInputs, painPoint: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('painPoints', tempInputs.painPoint, 'painPoint')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('painPoints', tempInputs.painPoint, 'painPoint')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.painPoints.map((pain, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {pain}
                          <button
                            onClick={() => removeArrayItem('painPoints', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Primary Goals</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a primary goal (e.g., Increase efficiency, Reduce costs)"
                        value={tempInputs.primaryGoal}
                        onChange={(e) => setTempInputs({ ...tempInputs, primaryGoal: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('primaryGoals', tempInputs.primaryGoal, 'primaryGoal')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('primaryGoals', tempInputs.primaryGoal, 'primaryGoal')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.primaryGoals.map((goal, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {goal}
                          <button
                            onClick={() => removeArrayItem('primaryGoals', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Secondary Goals</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a secondary goal (e.g., Better reporting, Team collaboration)"
                        value={tempInputs.secondaryGoal}
                        onChange={(e) => setTempInputs({ ...tempInputs, secondaryGoal: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                            e.preventDefault()
                            addArrayItem('secondaryGoals', tempInputs.secondaryGoal, 'secondaryGoal')
                          }
                        }}
                      />
                      <Button
                        onClick={() => addArrayItem('secondaryGoals', tempInputs.secondaryGoal, 'secondaryGoal')}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.secondaryGoals.map((goal, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer">
                          {goal}
                          <button
                            onClick={() => removeArrayItem('secondaryGoals', index)}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review & Save */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ICP Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Enterprise SaaS Decision Makers"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this customer profile..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Review summary */}
                <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg">ICP Summary</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Industry:</strong> {formData.industry || 'Not specified'}
                    </div>
                    <div>
                      <strong>Business Model:</strong> {formData.businessModel || 'Not specified'}
                    </div>
                    <div>
                      <strong>Age Range:</strong> {formData.ageRange[0]} - {formData.ageRange[1]} years
                    </div>
                    <div>
                      <strong>Education:</strong> {formData.education || 'Not specified'}
                    </div>
                    <div>
                      <strong>Occupation:</strong> {formData.occupation || 'Not specified'}
                    </div>
                    <div>
                      <strong>Income Range:</strong> ${formData.incomeRange[0].toLocaleString()} - ${formData.incomeRange[1].toLocaleString()}
                    </div>
                  </div>

                  {formData.painPoints.length > 0 && (
                    <div>
                      <strong>Key Pain Points:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.painPoints.slice(0, 3).map((pain, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {pain}
                          </Badge>
                        ))}
                        {formData.painPoints.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{formData.painPoints.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.primaryGoals.length > 0 && (
                    <div>
                      <strong>Primary Goals:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.primaryGoals.slice(0, 3).map((goal, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                        {formData.primaryGoals.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{formData.primaryGoals.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < 5 ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  Create ICP
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
