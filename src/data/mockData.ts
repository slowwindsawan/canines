import { User, Protocol, ProgressEntry, EducationalArticle, MembershipTier } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah@example.com',
  membershipTier: 'deepdive',
  joinDate: '2024-01-15',
  phone: '+1 (555) 123-4567',
  address: {
    street: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'United States'
  },
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true
  },
  subscription: {
    status: 'active',
    currentPeriodStart: '2024-01-15T00:00:00Z',
    currentPeriodEnd: '2024-02-15T00:00:00Z',
    cancelAtPeriodEnd: false
  },
  paymentMethod: {
    type: 'card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2027
  }
};

export const mockProtocols: Protocol[] = [
  {
    id: '1',
    dogId: 'dog-1',
    mealPlan: {
      breakfast: '1 cup lean ground turkey with sweet potato and green beans',
      dinner: '1 cup salmon with quinoa and steamed broccoli',
      mealsPerDay: 2,
    },
    supplements: [
      'Probiotics (1 capsule daily)',
      'Omega-3 Fish Oil (500mg daily)',
      'Digestive Enzymes (with meals)',
      'Milk Thistle (for liver support)',
    ],
    lifestyleTips: [
      'Provide 20-30 minutes of gentle exercise daily',
      'Ensure access to fresh water at all times',
      'Feed meals at consistent times',
      'Avoid table scraps and processed treats',
      'Monitor stress levels and provide calming environment',
    ],
    createdAt: '2024-01-20',
    version: 1,
  },
  {
    id: '2',
    dogId: 'dog-2',
    mealPlan: {
      breakfast: '3/4 cup chicken and rice with pumpkin puree',
      dinner: '3/4 cup white fish with sweet potato and carrots',
      mealsPerDay: 2,
    },
    supplements: [
      'Digestive Enzymes (1/2 capsule with meals)',
      'Probiotics (every other day)',
      'Omega-3 Fish Oil (250mg daily)',
      'Fiber supplement (1 tsp daily)',
    ],
    lifestyleTips: [
      'Shorter, more frequent walks (15 minutes, 3x daily)',
      'Monitor stool consistency daily',
      'Provide quiet eating environment',
      'Avoid high-fat treats temporarily',
      'Keep consistent meal schedule',
      'Watch for signs of digestive upset',
    ],
    createdAt: '2024-01-18',
    version: 1,
  },
];

export default mockProtocols;

export const mockProgressData: ProgressEntry[] = [
  {
    id: '1',
    dogId: 'dog-1',
    date: '2024-01-23',
    symptoms: ['loose_stool'],
    notes: 'Week 3 on new protocol. Stool consistency much better, energy levels back to normal. Max is playing fetch again!',
    improvementScore: 8,
  },
  {
    id: '2',
    dogId: 'dog-1',
    date: '2024-01-16',
    symptoms: ['loose_stool'],
    notes: 'Week 2 - Stool consistency improving gradually. Energy levels much better. Still some gas but less frequent.',
    improvementScore: 6,
  },
  {
    id: '3',
    dogId: 'dog-1',
    date: '2024-01-09',
    symptoms: ['loose_stool', 'lethargy', 'excessive_gas'],
    notes: 'Started new protocol today. Max seemed more energetic in the evening. Still having loose stools but less frequent.',
    improvementScore: 4,
  },
  {
    id: '4',
    dogId: 'dog-1',
    date: '2024-01-02',
    symptoms: ['loose_stool', 'lethargy', 'loss_appetite', 'excessive_gas'],
    notes: 'Before starting protocol. Max was very lethargic, poor appetite, and frequent digestive issues.',
    improvementScore: 2,
  },
  {
    id: '5',
    dogId: 'dog-1',
    date: '2023-12-26',
    symptoms: ['loose_stool', 'lethargy', 'loss_appetite', 'excessive_gas', 'vomiting'],
    notes: 'Initial symptoms started. Max had several episodes of vomiting and very loose stools. Took him to emergency vet.',
    improvementScore: 1,
  },
  {
    id: '6',
    dogId: 'dog-2',
    date: '2024-01-20',
    symptoms: ['loose_stool', 'lethargy'],
    notes: 'Luna showing some digestive sensitivity. Energy levels slightly lower than usual but still playful.',
    improvementScore: 6,
  },
  {
    id: '7',
    dogId: 'dog-2',
    date: '2024-01-13',
    symptoms: ['loose_stool', 'lethargy', 'excessive_gas'],
    notes: 'Started noticing loose stools and some lethargy. Luna seems uncomfortable after meals.',
    improvementScore: 4,
  },
];

export const mockArticles: EducationalArticle[] = [
  {
    id: '1',
    title: 'Understanding Your Dog\'s Digestive System: A Complete Guide',
    summary: 'Learn how your dog\'s digestive system works, common issues to watch for, and when to seek veterinary care.',
    content: 'Your dog\'s digestive system is a complex network that processes food and absorbs nutrients. Understanding how it works can help you identify potential problems early and maintain your pet\'s optimal health...',
    category: 'Digestive Health',
    featured: true,
  },
  {
    id: '2',
    title: 'Probiotics for Dogs: Benefits, Types, and Dosage Guidelines',
    summary: 'Discover how probiotics can support your dog\'s gut health, boost immunity, and improve overall wellbeing.',
    content: 'Probiotics are beneficial bacteria that support digestive health and immune function in dogs. Learn about different strains, proper dosing, and how to choose the right probiotic supplement...',
    category: 'Supplements',
    featured: true,
  },
  {
    id: '3',
    title: 'Creating a Stress-Free Environment for Your Dog',
    summary: 'Learn how to identify stress signals in dogs and create a calming environment that promotes better health.',
    content: 'Stress can significantly impact your dog\'s digestive health and overall wellbeing. Discover practical strategies for reducing anxiety and creating a peaceful home environment...',
    category: 'Lifestyle',
    featured: false,
  },
  {
    id: '4',
    title: 'Canine Nutrition Fundamentals: Building the Perfect Diet',
    summary: 'Essential nutrition guidelines covering proteins, fats, carbohydrates, and vitamins for optimal canine health.',
    content: 'Proper nutrition is the foundation of good health for dogs. Learn about macronutrients, micronutrients, and how to read dog food labels to make informed choices...',
    category: 'Nutrition',
    featured: true,
  },
  {
    id: '5',
    title: 'Recognizing Food Allergies and Intolerances in Dogs',
    summary: 'How to identify, diagnose, and manage food allergies and sensitivities in your canine companion.',
    content: 'Food allergies affect many dogs and can cause digestive upset, skin issues, and behavioral changes. Learn the difference between allergies and intolerances, common trigger foods, and elimination diet protocols...',
    category: 'Digestive Health',
    featured: true,
  },
  {
    id: '6',
    title: 'The Role of Fiber in Your Dog\'s Diet',
    summary: 'Understanding how dietary fiber supports digestive health and helps manage various conditions.',
    content: 'Fiber plays a crucial role in maintaining healthy digestion, managing weight, and supporting beneficial gut bacteria. Discover the best sources of fiber and how much your dog needs...',
    category: 'Nutrition',
    featured: false,
  },
  {
    id: '7',
    title: 'Exercise and Digestive Health: The Connection',
    summary: 'How regular physical activity supports your dog\'s digestive system and overall wellness.',
    content: 'Regular exercise doesn\'t just keep your dog physically fit—it also promotes healthy digestion, reduces stress, and can help prevent various health issues...',
    category: 'Lifestyle',
    featured: false,
  },
  {
    id: '8',
    title: 'Senior Dog Nutrition: Special Considerations',
    summary: 'Adapting your older dog\'s diet to support aging digestive systems and changing nutritional needs.',
    content: 'As dogs age, their nutritional needs change. Learn how to adjust diet, supplements, and feeding schedules to support your senior dog\'s health and comfort...',
    category: 'Nutrition',
    featured: false,
  },
  {
    id: '9',
    title: 'Natural Remedies for Common Digestive Issues',
    summary: 'Safe, natural approaches to supporting your dog\'s digestive health alongside veterinary care.',
    content: 'Explore natural remedies like pumpkin, bone broth, and herbal supplements that can complement traditional veterinary treatment for digestive issues...',
    category: 'Supplements',
    featured: false,
  },
  {
    id: '10',
    title: 'When to Call the Vet: Digestive Emergency Signs',
    summary: 'Critical warning signs that require immediate veterinary attention for your dog\'s digestive health.',
    content: 'Learn to recognize the difference between minor digestive upset and serious emergencies that require immediate veterinary care. Time-sensitive symptoms every dog owner should know...',
    category: 'Digestive Health',
    featured: true,
  },
];

export const membershipTiers: MembershipTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29/month',
    features: [
      'Basic symptom intake',
      'General protocol recommendations',
      'Monthly progress tracking',
      'Access to educational content',
    ],
  },
  {
    id: 'deepdive',
    name: 'Deep Dive',
    price: '$69/month',
    features: [
      'Comprehensive symptom analysis',
      'Detailed custom protocols',
      'Weekly progress tracking',
      'Priority support',
      'Advanced educational resources',
      'Supplement recommendations',
    ],
    recommended: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    price: '$149/month',
    features: [
      'One-on-one consultation',
      'Fully personalized protocols',
      'Daily progress monitoring',
      '24/7 support access',
      'Custom supplement formulations',
      'Direct veterinarian access',
    ],
  },
];