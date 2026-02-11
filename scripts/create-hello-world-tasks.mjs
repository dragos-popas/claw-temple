#!/usr/bin/env node
/**
 * Create 3 Hello World Tasks for Production Testing
 * 
 * Creates tasks in BACKLOG that will be picked up by the task processor
 */

const API_URL = 'http://localhost:3000/api';

const helloWorldTasks = [
  {
    title: 'Hello World - Python',
    description: 'Create a simple "Hello, World!" program in Python that prints the message and includes a function to greet by name. Include comments and follow PEP 8 style guide.',
    language: 'Python',
    type: 'general',
    priority: 5
  },
  {
    title: 'Hello World - TypeScript',
    description: 'Create a simple "Hello, World!" program in TypeScript that prints the message and includes a typed function to greet by name. Include proper types and follow TypeScript best practices.',
    language: 'TypeScript',
    type: 'general',
    priority: 5
  },
  {
    title: 'Hello World - Go',
    description: 'Create a simple "Hello, World!" program in Go that prints the message and includes a function to greet by name. Follow Go conventions and include proper package structure.',
    language: 'Go',
    type: 'general',
    priority: 5
  }
];

async function createTask(task) {
  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        priority: task.priority,
        type: task.type,
        language: task.language,
        template: 'general-programming'
        // Note: status is auto-set by server based on task type
        // General tasks will start in TODO status
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Created task: ${task.title} (ID: ${data.id})`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to create task "${task.title}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Creating 3 Hello World Tasks for Production Testing...\n');

  const createdTasks = [];
  for (const task of helloWorldTasks) {
    const created = await createTask(task);
    if (created) {
      createdTasks.push(created);
    }
  }

  console.log(`\n📊 Summary: ${createdTasks.length}/3 tasks created successfully`);
  
  if (createdTasks.length === 3) {
    console.log('\n✨ All tasks created! The task processor will pick them up automatically.');
    console.log('Monitor progress at: http://localhost:3000');
  } else {
    console.log('\n⚠️  Some tasks failed to create. Check the server status.');
  }
}

main().catch(console.error);
