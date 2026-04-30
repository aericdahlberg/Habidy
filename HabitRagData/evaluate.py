import os
import sys
import requests
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env.local')

VOYAGE_API_KEY    = os.environ.get('VOYAGE_API_KEY')
SUPABASE_URL      = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY      = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')

if not all([VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY]):
    print('ERROR: Missing required env vars in .env.local')
    sys.exit(1)

import anthropic
from supabase import create_client
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_anthropic import ChatAnthropic
from langchain_voyageai import VoyageAIEmbeddings

TEST_QUESTIONS = [
    'What is the habit loop and how does it work?',
    'What is the two-minute rule for building habits?',
    'How does identity affect habit formation?',
    'What does make it obvious mean in habit building?',
    'How can implementation intentions help you stick to habits?',
    'What is habit stacking?',
    'Why is environment design important for habits?',
    'What is the difference between motion and action in habit building?',
    'How does the Goldilocks rule apply to staying motivated?',
    'What is the cardinal rule of behavior change?',
]


def embed_text(text: str) -> list:
    response = requests.post(
        'https://api.voyageai.com/v1/embeddings',
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {VOYAGE_API_KEY}',
        },
        json={'input': [text], 'model': 'voyage-3'},
    )
    if response.status_code == 402:
        print('ERROR: Voyage AI billing limit reached — no charges made beyond free tier')
        sys.exit(1)
    if not response.ok:
        print(f'ERROR: Voyage AI failed ({response.status_code}): {response.text}')
        sys.exit(1)
    return response.json()['data'][0]['embedding']


def retrieve_chunks(question: str, match_count: int = 5) -> list:
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    embedding = embed_text(question)
    result = client.rpc('match_documents', {
        'query_embedding': embedding,
        'match_count': match_count,
        'match_threshold': 0.5,
    }).execute()
    return [row['content'] for row in result.data]


def generate_answer(question: str, contexts: list) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    context_text = '\n\n'.join(contexts)
    message = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=512,
        system=(
            'Answer the question using only the provided context from '
            'Atomic Habits by James Clear.\n\n'
            f'Context:\n{context_text}'
        ),
        messages=[{'role': 'user', 'content': question}],
    )
    return message.content[0].text


def main():
    print('Building evaluation dataset...\n')

    questions, answers, contexts = [], [], []

    for i, question in enumerate(TEST_QUESTIONS):
        print(f'  [{i + 1}/{len(TEST_QUESTIONS)}] {question}')
        retrieved = retrieve_chunks(question)
        if not retrieved:
            print(f'  WARNING: No chunks retrieved for this question — is the ingestion script done?')
        answer = generate_answer(question, retrieved)
        questions.append(question)
        answers.append(answer)
        contexts.append(retrieved)

    print('\nRunning RAGAS evaluation...\n')

    dataset = Dataset.from_dict({
        'question': questions,
        'answer': answers,
        'contexts': contexts,
    })

    llm = LangchainLLMWrapper(ChatAnthropic(
        model='claude-haiku-4-5-20251001',
        api_key=ANTHROPIC_API_KEY,
    ))

    embeddings = LangchainEmbeddingsWrapper(VoyageAIEmbeddings(
        voyage_api_key=VOYAGE_API_KEY,
        model='voyage-3',
    ))

    result = evaluate(
        dataset=dataset,
        metrics=[faithfulness, answer_relevancy],
        llm=llm,
        embeddings=embeddings,
    )

    print('=' * 40)
    print('RAGAS Evaluation Results')
    print('=' * 40)
    print(f'Faithfulness:      {result["faithfulness"]:.3f}')
    print(f'Answer Relevancy:  {result["answer_relevancy"]:.3f}')
    print('=' * 40)
    print('\nScores range from 0 to 1. Higher is better.')
    print('Faithfulness: does the answer only use what the retrieved chunks say?')
    print('Answer Relevancy: does the answer actually address the question?')


if __name__ == '__main__':
    main()
