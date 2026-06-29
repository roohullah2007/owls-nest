{{-- Bridge view: emits a pre-rendered, sanitised HTML body produced by
     App\Services\Email\EmailTemplateRenderer. The string is already escaped /
     sanitised there, so it is output raw here. --}}
{!! $html !!}
