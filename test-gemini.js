// Test script for Gemini API models
const API_KEY = 'AIzaSyDXo9-_1q5ErqPZAiJ_9BQL6pLNlkkGcEQ';

async function testModel(modelName) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
  
  const requestBody = {
    contents: [{
      parts: [{
        text: "Say 'Hello, I am working!' in one sentence."
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100
    }
  };

  try {
    console.log(`\nTesting model: ${modelName}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      console.log(`✅ ${modelName} WORKS!`);
      console.log(`   Response: ${text.substring(0, 100)}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${modelName} FAILED`);
      console.log(`   Error: ${error.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${modelName} ERROR: ${error.message}`);
    return false;
  }
}

async function testAllModels() {
  console.log('Testing Gemini Models with API Key...\n');
  console.log('================================');
  
  const models = [
    // Known working models
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-pro',
    
    // Experimental models
    'gemini-2.0-flash-exp',
    'gemini-exp-1206',
    
    // Test 2.5 models (may not work yet)
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
  ];

  const results = {};
  
  for (const model of models) {
    results[model] = await testModel(model);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\n================================');
  console.log('SUMMARY:');
  console.log('Working models:');
  Object.entries(results).forEach(([model, works]) => {
    if (works) {
      console.log(`  ✅ ${model}`);
    }
  });
  
  console.log('\nFailed models:');
  Object.entries(results).forEach(([model, works]) => {
    if (!works) {
      console.log(`  ❌ ${model}`);
    }
  });
}

// Run the test
testAllModels().catch(console.error);
