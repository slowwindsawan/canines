from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

DEFAULT_ONBOARDING_FORM = [
    {
        "id": "field_1757848467880_wn8vf6mpg",
        "name": "dob",
        "label": "Date of birth",
        "type": "date",
        "value": "2025-09-14",
        "description": "Date of birth of the dog",
        "errorText": "",
        "aiText": "",
        "required": False,
        "placeholder": "Date of birth"
    },
    {
        "id": "field_1757848521583_iluzpo6pp",
        "name": "sex",
        "label": "Sex",
        "type": "radio",
        "value": "",
        "description": "Sex of the dog",
        "errorText": "",
        "aiText": "Sex of the dog",
        "required": True,
        "placeholder": "Sex",
        "options": [
            {"value": "male", "label": "Male"},
            {"value": "female", "label": "Female"}
        ]
    },
    {
        "id": "field_1757848630627_58awz0wbn",
        "name": "neutered",
        "label": "Neutered status",
        "type": "radio",
        "value": "",
        "description": "Is your dog neutered.",
        "errorText": "",
        "aiText": "Dog's Neutered status.",
        "required": True,
        "placeholder": "Neutered",
        "options": [
            {"value": "yes", "label": "Yes"},
            {"value": "no", "label": "No"}
        ]
    },
    {
        "id": "field_1757848893614_7dtcc9moc",
        "name": "body_condition",
        "label": "Body condition",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Body condition of the dog",
        "required": True,
        "placeholder": "Body condition of your dog",
        "options": [
            {"value": "under_weight", "label": "Underweight (ribs easily visible)"},
            {"value": "ideal_weight", "label": "Ideal weight (ribs easily felt)"},
            {"value": "cuddly", "label": "A bit cuddly (ribs hard to feel)"}
        ]
    },
    {
        "id": "field_1757849042825_c4p3hrzr3",
        "name": "current_diet",
        "label": "Current Diet",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "The Dog's Current Diet",
        "required": True,
        "placeholder": "Current Diet",
        "options": [
            {"value": "raw", "label": "Raw"},
            {"value": "kibble", "label": "Kibble"},
            {"value": "cooked", "label": "Cooked"},
            {"value": "mixed", "label": "Mixed"}
        ]
    },
    {
        "id": "field_1757849182580_ktag1jt6x",
        "name": "feeding_frequency",
        "label": "Feeding frequency",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's daily feeding frequency.",
        "required": True,
        "placeholder": "Feeding frequency",
        "options": [
            {"value": "once_daily", "label": "Once Daily"},
            {"value": "twice_daily", "label": "Twice Daily"},
            {"value": "thrice_daily", "label": "Thrice Daily"},
            {"value": "more_than_thrice", "label": "More than thrice daily"}
        ]
    },
    {
        "id": "field_1757849319761_qfeu77lo3",
        "name": "water_source",
        "label": "Water Source",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's drinking water source.",
        "required": True,
        "placeholder": "Water Source",
        "options": [
            {"value": "tap_water", "label": "Tap water"},
            {"value": "filtered_water", "label": "Filtered water"},
            {"value": "tank_water", "label": "Tank water"},
            {"value": "bore_water", "label": "Bore water"},
            {"value": "other_water_source", "label": "Other"}
        ]
    },
    {
        "id": "field_1757849448606_q2bax1y6m",
        "name": "treats",
        "label": "Treats, Extras & Table Scraps",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Treats, Extras & Table Scraps of the dog.",
        "required": True,
        "placeholder": "List any treats, human food, or extras they get..."
    },
    {
        "id": "field_1757849535807_ac33bzcf0",
        "name": "other_food_access",
        "label": "Access to Other Foods",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Other food sources of the dog.",
        "required": False,
        "placeholder": "Dog food, scavenging, stock feed, compost raids..."
    },
    {
        "id": "field_1757849619964_cwm9tyo4k",
        "name": "current_supplements",
        "label": "Current Supplements",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's current supplements",
        "required": False,
        "placeholder": "List any supplements with brand and dosage..."
    },
    {
        "id": "field_1757849685574_kj23t13p5",
        "name": "food_intolerance",
        "label": "Any known food intolerances?",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "current medications and diagnosis",
        "required": False,
        "placeholder": "List any current medications with dosage..."
    },
    {
        "id": "field_1757849737914_6nfv3tzfx",
        "name": "previous_gut_issue",
        "label": "Previous gut issues?",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's previous gut issues.",
        "required": False,
        "placeholder": "Any notable past medications..."
    },
    {
        "id": "field_1757849789326_h4bzekpar",
        "name": "stool_changes_frequency",
        "label": "Frequency of stool changes",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's Frequency of stool changes",
        "required": False,
        "placeholder": "Any diagnosed conditions (skin, joints, digestive, etc.)..."
    },
    {
        "id": "field_1757849848179_hibprhk52",
        "name": "stool_quality_over_last_month",
        "label": "Stool quality over last month?",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's Stool quality over last month?",
        "required": False,
        "placeholder": "Any surgeries or major injuries..."
    },
    {
        "id": "field_1757849908464_biu1bvhdp",
        "name": "hot_spots",
        "label": "Any hot spots?",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Any hot spots in dog?",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "yes", "label": "Yes"},
            {"value": "no", "label": "No"}
        ]
    },
    {
        "id": "field_1757849958522_bau2e6ubh",
        "name": "coat_issues",
        "label": "Coat issues?",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's coat issues.",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "dull", "label": "Dull"},
            {"value": "sheeding", "label": "Sheeding"},
            {"value": "both", "label": "Both"},
            {"value": "none", "label": "None"}
        ]
    },
    {
        "id": "field_1757850226239_eopuykgaf",
        "name": "avg_daily_activity",
        "label": "Average daily activity?",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's average daily activity.",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "low", "label": "Low"},
            {"value": "moderate", "label": "Moderate"},
            {"value": "high", "label": "High"}
        ]
    },
    {
        "id": "field_1757850285866_mnbqj9jzy",
        "name": "energy_dips",
        "label": "Energy dips after meals?",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's energy dips after meals.",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "yes", "label": "Yes"},
            {"value": "no", "label": "No"}
        ]
    },
    {
        "id": "field_1757850326857_uufqaktca",
        "name": "mood_changes",
        "label": "Mood changes",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's mood changes.",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "Lethargic", "label": "Lethargic"},
            {"value": "Restless", "label": "Restless"},
            {"value": " Normal", "label": " Normal"}
        ]
    },
    {
        "id": "field_1757850467269_4od7gjul5",
        "name": "past_anitbiotic_use",
        "label": "Past antibiotic use?",
        "type": "radio",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Dog's past antibiotic use.",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "never", "label": "Never"},
            {"value": "once", "label": "Once"},
            {"value": "multiple", "label": "Multiple in past year"}
        ]
    },
    {
        "id": "field_1757850567468_twc0eopgc",
        "name": "supplements_currently_given",
        "label": "Supplements currently given?",
        "type": "textarea",
        "value": "",
        "description": "",
        "errorText": "",
        "aiText": "Current supplements given to the dog.",
        "required": True,
        "placeholder": "Describe your main concern in your own words..."
    },
    {
        "id": "field_1757850817879_0hlsuqldb",
        "name": "joining_reason",
        "label": "Main reason for joining?",
        "type": "checkbox",
        "value": False,
        "description": "",
        "errorText": "",
        "aiText": "What is the purpose of the dog's owner?",
        "required": True,
        "placeholder": "",
        "options": [
            {"value": "better_stool", "label": "Better Stoll"},
            {"value": "less_itch", "label": "Less Itch"},
            {"value": "more_energy", "label": "More energy"},
            {"value": "general_wellness", "label": "General wellness"}
        ]
    }
]