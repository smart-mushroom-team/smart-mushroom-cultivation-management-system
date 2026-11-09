import 'package:flutter/material.dart';
import '../core/api_client.dart';

class PolicyScreen extends StatefulWidget {
  const PolicyScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<PolicyScreen> createState() => _PolicyScreenState();
}
class _PolicyScreenState extends State<PolicyScreen> {
  late final Future<Map<String,dynamic>> data;
  @override
  void initState(){super.initState();data=widget.api.get('/api/core/policies/current').then((v)=>v as Map<String,dynamic>);}
  @override
  Widget build(BuildContext context)=>Scaffold(
    appBar:AppBar(title:const Text('Chính sách')),
    body:FutureBuilder<Map<String,dynamic>>(future:data,builder:(context,s){
      if(s.hasError)return Center(child:Text('Không tải được chính sách: ${s.error}'));
      if(!s.hasData)return const Center(child:CircularProgressIndicator());
      final d=s.data!;
      return ListView(padding:const EdgeInsets.all(20),children:[
        Text('Phiên bản ${d['version'] ?? 'chưa công bố'}',style:Theme.of(context).textTheme.titleMedium),
        const SizedBox(height:12),SelectableText(d['content'] as String? ?? ''),
      ]);
    }),
  );
}
