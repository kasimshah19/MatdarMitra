import os
import time
from main import run_extraction_job, JOBS

def run_test():
    dl_dir = r'C:\Users\kasim\Downloads'
    pdf_files = [f for f in os.listdir(dl_dir) if 'ENG-72' in f and f.endswith('.pdf')]
    if not pdf_files:
        print('No target PDF found for test.')
        return
    target_pdf = os.path.join(dl_dir, pdf_files[0])
    job_id = 'e2e_test_job'
    JOBS[job_id] = {'status': 'pending', 'recordsExtracted': 0, 'totalPages': 0, 'pagesProcessed': 0}
    print(f'Starting E2E Extraction Test on: {target_pdf}')
    start_time = time.time()
    run_extraction_job(job_id, target_pdf)
    elapsed = time.time() - start_time
    job_data = JOBS.get(job_id, {})
    if job_data.get('status') == 'completed':
        result = job_data.get('result', {})
        voters = result.get('voters', [])
        needs_review = sum(1 for v in voters if v.get('needsReview', False))
        print('\n--- E2E TEST SUMMARY ---')
        print(f'Time Taken: {elapsed:.2f} seconds')
        print(f'Pages Processed: {job_data.get("totalPages")}')
        print(f'Total Extracted: {len(voters)}')
        print(f'Flagged Needs Review: {needs_review}')
        print('\nSample 5 Records:')
        for idx, v in enumerate(voters[:5]):
            print(f'{idx+1}. EPC: {v.get("epcNo", "")} | Name: {v.get("voterName", "")} | Age: {v.get("age", 0)} | Rev: {v.get("needsReview")}')
    else:
        print('\nPipeline failed!')
        print(job_data.get('error', 'Unknown error'))

if __name__ == '__main__':
    run_test()
