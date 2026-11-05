<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['description' => $this->input('description') ?? '']);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:64',
                Rule::unique('categories', 'name')->where('user_id', $this->user()->id),
            ],
            'description' => ['nullable', 'string', 'max:160'],
        ];
    }
}
