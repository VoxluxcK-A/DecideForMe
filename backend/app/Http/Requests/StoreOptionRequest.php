<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOptionRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['description' => $this->input('description') ?? '']);
    }

    public function authorize(): bool
    {
        return $this->user()?->can('view', $this->route('category')) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:64',
                Rule::unique('decision_options', 'name')->where('category_id', $this->route('category')->id),
            ],
            'description' => ['nullable', 'string', 'max:160'],
        ];
    }
}
