{{-- Test file for Flux UI v2 extension --}}
{{-- Open this file and test autocomplete features --}}

<div>
    {{-- Test 1: Type < and see flux suggestions --}}


    {{-- Test 2: Type <flux: and see all components --}}


    {{-- Test 3: Inside a component tag, press space for prop suggestions --}}
    <flux:button >Click me</flux:button>

    {{-- Test 4: Self-closing component --}}
    <flux:input />

    {{-- Test 5: New v2 components --}}
    <flux:select name="country">
        <flux:select.option value="us">United States</flux:select.option>
    </flux:select>

    {{-- Test 6: Modal with nested components --}}
    <flux:modal name="example">
        <flux:heading>Title</flux:heading>
        <flux:text>Content here</flux:text>
    </flux:modal>

    {{-- Test 7: Pro component --}}
    <flux:chart type="line" :data="$chartData" />
</div>
