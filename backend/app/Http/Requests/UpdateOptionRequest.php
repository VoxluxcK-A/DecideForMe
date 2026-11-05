<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOptionRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['description' => $this->input('description') ?? '']);
    }

    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('option')) ?? false;
    }

    public function rules(): array
    {
        return [
            'category_id' => [
                'required',
                'integer',
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id),
            ],
            'name' => [
                'required',
                'string',
                'max:64',
                Rule::unique('decision_options', 'name')
                    ->where('category_id', $this->input('category_id'))
                    ->ignore($this->route('option')),
            ],
            'description' => ['nullable', 'string', 'max:160'],
        ];
    }
}
