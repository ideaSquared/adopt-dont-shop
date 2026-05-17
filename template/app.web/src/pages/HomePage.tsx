import { ExampleService } from '@my-org/lib.example';
import { useState } from 'react';

const service = new ExampleService({ debug: false });

export function HomePage() {
  const [input, setInput] = useState('hello from app.web');
  const [result, setResult] = useState<string>('');

  const handleProcess = () => {
    const res = service.processItem(input);
    setResult(JSON.stringify(res, null, 2));
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>TypeScript Monorepo Template</h1>
      <p>This page demonstrates importing a shared library (<code>@my-org/lib.example</code>) into a Vite + React app.</p>

      <section style={{ marginTop: '2rem' }}>
        <label htmlFor='example-input' style={{ display: 'block', marginBottom: '0.5rem' }}>
          Input:
        </label>
        <input
          id='example-input'
          type='text'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: '0.5rem', width: '100%', maxWidth: 400 }}
        />
        <button
          type='button'
          onClick={handleProcess}
          style={{ marginLeft: '0.5rem', padding: '0.5rem 1rem' }}
        >
          Run ExampleService.processItem
        </button>
      </section>

      {result && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Result</h2>
          <pre
            style={{
              background: '#f4f4f4',
              padding: '1rem',
              borderRadius: 4,
              overflow: 'auto',
            }}
          >
            {result}
          </pre>
        </section>
      )}
    </main>
  );
}
